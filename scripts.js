(function () {
  const canvas = document.getElementById('canvas');
  const fileInput = document.getElementById('fileInput');
  const startDateColorpicker = document.getElementById('startDateColorpicker');
  const endDateColorpicker = document.getElementById('endDateColorpicker');
  const graphButton = document.getElementById('graphButton');
  const granularitySelect = document.getElementById('granularitySelect');
  const startOfWeekSelect = document.getElementById('startOfWeekSelect');
  const endOfWeekSelect = document.getElementById('endOfWeekSelect');
  const cardsTable = document.getElementById('cardsTable');

  let chartGranularity = 'day';
  let jsData;
  let cardsByDate;
  let cardsByWeek;
  let cardsByMonth;
  let sortedDates;
  let sortedWeeks;
  let sortedMonths;
  let startDateBarColor = '#f9c5bd';
  let endDateBarColor = '#9bc400';
  let startOfWeek = 1;
  let endOfWeek = 5;
  let xCoordinates = [];
  let yCoordinates = [];

  fileInput.addEventListener(
    'change',
    () => {
      const fr = new FileReader();
      fr.readAsText(fileInput.files[0]);
      fr.addEventListener('load', () => {
        const csv = fr.result;
        jsData = csvToJSON(fr.result);
        calculateCardLists();
        graphButton.disabled = false;
      });
    },
    false
  );

  function csvToJSON(csv) {
    const lines = csv.split('\r\n');
    const result = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const obj = {};
      const currentline = lines[i].split(',');

      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j];
      }
      result.push(obj);
    }
    return result;
  }

  function calculateCardLists() {
    cardsByDate = buildListByDate(jsData);
    cardsByWeek = buildListByWeek(jsData);
    cardsByMonth = buildListByMonth(jsData);
    sortedDates = Object.keys(cardsByDate).sort();
    sortedWeeks = Object.keys(cardsByWeek).sort();
    sortedMonths = Object.keys(cardsByMonth).sort();
  }

  function buildListByDate(data) {
    let allDatesList = {};
    data.forEach((el) => {
      const startDate = el['Start Date'].substring(0, 10);
      const endDate = el['End Date'].substring(0, 10);

      if (startDate) {
        if (!allDatesList[startDate]) {
          allDatesList[startDate] = {
            started: [],
            ended: [],
          };
        }

        if (isWorkDay(startOfWeek, endOfWeek, startDate)) {
          allDatesList[startDate].started.push(el);
        }
      }

      if (endDate) {
        if (!allDatesList[endDate]) {
          allDatesList[endDate] = {
            started: [],
            ended: [],
          };
        }

        if (isWorkDay(startOfWeek, endOfWeek, endDate)) {
          allDatesList[endDate].ended.push(el);
        }
      }
    });
    return allDatesList;
  }

  function buildListByWeek(data) {
    let allWeeksList = {};
    data.forEach((el) => {
      const startDate = el['Start Date'];
      const endDate = el['End Date'];
      let startDateWeekStart;
      let endDateWeekStart;

      if (startDate) {
        startDateWeekStart = getStartOfWeek(
          el['Start Date'],
          startOfWeek,
          endOfWeek
        );
      }

      if (endDate) {
        endDateWeekStart = getStartOfWeek(
          el['End Date'],
          startOfWeek,
          endOfWeek
        );
      }

      if (startDateWeekStart) {
        if (!allWeeksList[startDateWeekStart]) {
          allWeeksList[startDateWeekStart] = {
            started: [],
            ended: [],
          };
        }
        allWeeksList[startDateWeekStart].started.push(el);
      }

      if (endDateWeekStart) {
        if (!allWeeksList[endDateWeekStart]) {
          allWeeksList[endDateWeekStart] = {
            started: [],
            ended: [],
          };
        }

        allWeeksList[endDateWeekStart].ended.push(el);
      }
    });
    return allWeeksList;
  }

  function buildListByMonth(data) {
    let allMonthsList = {};
    data.forEach((el) => {
      const startDate = el['Start Date'].substring(0, 7).trim();
      const endDate = el['End Date'].substring(0, 7).trim();

      if (startDate) {
        if (!allMonthsList[startDate]) {
          allMonthsList[startDate] = {
            started: [],
            ended: [],
          };
        }
        if (isWorkDay(startOfWeek, endOfWeek, startDate)) {
          allMonthsList[startDate].started.push(el);
        }
      }

      if (endDate) {
        if (!allMonthsList[endDate]) {
          allMonthsList[endDate] = {
            started: [],
            ended: [],
          };
        }
        if (isWorkDay(startOfWeek, endOfWeek, endDate)) {
          allMonthsList[endDate].ended.push(el);
        }
      }
    });
    return allMonthsList;
  }

  graphButton.addEventListener('click', redraw, false);

  function redraw(e) {
    if (e) {
      e.preventDefault();
    }
    switch (chartGranularity) {
      case 'day':
        drawGraph(cardsByDate, sortedDates);
        break;
      case 'week':
        drawGraph(cardsByWeek, sortedWeeks);
        break;
      case 'month':
        drawGraph(cardsByMonth, sortedMonths);
        break;
      default:
        drawGraph(cardsByDate, sortedDates);
    }
  }

  function drawGraph(
    data,
    sortedDataMap,
    barPixelWidth = 30,
    barPixelHeight = 300,
    padding = 15,
    xLabelPaddingLeft = 40
  ) {
    // Set canvas dimensions
    canvas.setAttribute(
      'width',
      xLabelPaddingLeft +
        padding +
        sortedDataMap.length * barPixelWidth * 2 +
        sortedDataMap.length * padding
    );
    canvas.setAttribute('height', barPixelHeight + padding * 4);

    // Prep canvas for drawing
    const ctx = canvas.getContext('2d');

    // Calculate bar unit height in pixels
    const maxValue = findMaxValue(data, sortedDataMap);
    const unitPixelHeight = barPixelHeight / maxValue;

    // Save X and Y coordinates to determine clicked bar later
    xCoordinates = [];
    yCoordinates = [];

    for (i = 0; i < sortedDataMap.length; i++) {
      xCoordinates.push(
        xLabelPaddingLeft + (i + 1) * padding + i * barPixelWidth * 2
      );

      let yCoordObject = {};
      const startDateBarHeight =
        data[sortedDataMap[i]].started.length * unitPixelHeight;
      const startDateBarYCoordinate =
        barPixelHeight +
        padding -
        data[sortedDataMap[i]].started.length * unitPixelHeight;
      const endedBarYCoordinate =
        barPixelHeight +
        padding -
        data[sortedDataMap[i]].ended.length * unitPixelHeight;
      const endedBarHeight =
        data[sortedDataMap[i]].ended.length * unitPixelHeight;

      yCoordObject.started = {
        yCoordinate: startDateBarYCoordinate,
        height: startDateBarHeight,
      };
      yCoordObject.ended = {
        yCoordinate: endedBarYCoordinate,
        height: endedBarHeight,
      };
      yCoordinates.push(yCoordObject);

      // Draw start date bar
      ctx.textAlign = 'center';
      ctx.fillStyle = startDateBarColor;
      ctx.fillRect(
        xLabelPaddingLeft + (i + 1) * padding + i * barPixelWidth * 2,
        barPixelHeight +
          padding -
          data[sortedDataMap[i]].started.length * unitPixelHeight,
        barPixelWidth,
        data[sortedDataMap[i]].started.length * unitPixelHeight
      );

      // Draw start date bar text
      ctx.fillStyle = 'black';
      ctx.fillText(
        data[sortedDataMap[i]].started.length,
        xLabelPaddingLeft +
          (i + 1) * padding +
          i * (barPixelWidth * 2) +
          barPixelWidth / 2,
        barPixelHeight + padding / 2
      );

      // Draw end date bar
      ctx.fillStyle = endDateBarColor;
      ctx.fillRect(
        xLabelPaddingLeft +
          (i + 1) * padding +
          i * barPixelWidth * 2 +
          barPixelWidth,
        barPixelHeight +
          padding -
          data[sortedDataMap[i]].ended.length * unitPixelHeight,
        barPixelWidth,
        data[sortedDataMap[i]].ended.length * unitPixelHeight
      );

      // Draw end date bar text
      ctx.fillStyle = 'black';
      ctx.fillText(
        data[sortedDataMap[i]].ended.length,
        xLabelPaddingLeft +
          (i + 1) * padding +
          i * (barPixelWidth * 2) +
          barPixelWidth +
          barPixelWidth / 2,
        barPixelHeight + padding / 2
      );
    }

    // Draw axes
    ctx.fillStyle = 'black';
    ctx.lineWidth = 2.0;
    ctx.moveTo(xLabelPaddingLeft, padding);
    ctx.lineTo(xLabelPaddingLeft, barPixelHeight + padding);
    ctx.lineTo(
      xLabelPaddingLeft +
        padding +
        sortedDataMap.length * barPixelWidth * 2 +
        sortedDataMap.length * padding,
      barPixelHeight + padding
    );
    ctx.stroke();

    // Draw y-axis labels
    ctx.textAlign = 'right';

    // Max value
    ctx.fillText(maxValue, xLabelPaddingLeft - 10, padding + 4);
    ctx.moveTo(xLabelPaddingLeft - 5, padding);
    ctx.lineTo(xLabelPaddingLeft, padding);
    ctx.stroke();

    // Zero
    ctx.fillText(0, xLabelPaddingLeft - 10, barPixelHeight + padding);

    // Draw x-axis labels
    ctx.textAlign = 'center';
    for (i = 0; i < sortedDataMap.length; i++) {
      ctx.fillText(
        chartGranularity === 'week' ? `Week of` : sortedDataMap[i],
        xLabelPaddingLeft +
          (i + 1) * padding +
          (i + 1) * barPixelWidth +
          i * barPixelWidth,
        barPixelHeight + padding * 2
      );

      ctx.fillText(
        chartGranularity === 'week' ? sortedDataMap[i] : '',
        xLabelPaddingLeft +
          (i + 1) * padding +
          (i + 1) * barPixelWidth +
          i * barPixelWidth,
        barPixelHeight + padding * 3
      );
    }

    // Draw legend
    ctx.fillStyle = startDateBarColor;
    ctx.fillRect(xLabelPaddingLeft, barPixelHeight + padding * 3 + 2, 50, 10);
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(
      'Started cards',
      xLabelPaddingLeft + 45 + padding / 2,
      barPixelHeight + padding * 3.75
    );

    ctx.fillStyle = endDateBarColor;
    ctx.fillRect(
      xLabelPaddingLeft + 140,
      barPixelHeight + padding * 3 + 2,
      50,
      10
    );
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText(
      'Finished cards',
      xLabelPaddingLeft + 185 + padding / 2,
      barPixelHeight + padding * 3.75
    );
  }

  function findMaxValue(data, datamap) {
    const maxItem = datamap.reduce((prev, current, idx) => {
      const largerLength =
        data[current].started.length > data[current].ended.length
          ? data[current].started.length
          : data[current].ended.length;

      return largerLength > prev ? largerLength : prev;
    }, 0);
    return maxItem;
  }

  granularitySelect.addEventListener('change', (e) => {
    chartGranularity = e.target.value;
    if (jsData) {
      redraw();
    }
  });

  function changeStartDateBarColor(event) {
    startDateBarColor = event.target.value;
    if (jsData) {
      redraw();
    }
  }

  function changeEndDateBarColor(event) {
    endDateBarColor = event.target.value;
    if (jsData) {
      redraw();
    }
  }

  startDateColorpicker.addEventListener(
    'change',
    changeStartDateBarColor,
    false
  );

  endDateColorpicker.addEventListener('change', changeEndDateBarColor, false);

  startOfWeekSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    startOfWeek = selected;
    if (jsData) {
      calculateCardLists();
      redraw();
    }
  });

  endOfWeekSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    endOfWeek = selected;
    if (jsData) {
      calculateCardLists();
      redraw();
    }
  });

  function isWorkDay(startOfWeek, endOfWeek, date) {
    dateToTest = new Date(date).getDay();

    if (startOfWeek < endOfWeek) {
      return dateToTest >= startOfWeek && dateToTest <= endOfWeek;
    }
    if (startOfWeek > endOfWeek) {
      return !(dateToTest > endOfWeek && dateToTest < startOfWeek);
    }
  }

  function getStartOfWeek(date, startOfWeek, endOfWeek) {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();
    let daysToBeginningOfWeek;

    if (isWorkDay(startOfWeek, endOfWeek, date)) {
      if (dayOfWeek >= startOfWeek) {
        daysToBeginningOfWeek = dayOfWeek - startOfWeek;
      } else {
        daysToBeginningOfWeek = dayOfWeek + (7 - startOfWeek);
      }

      const finalDate = dayOfMonth - daysToBeginningOfWeek;
      dateObj.setDate(finalDate);

      return dateObj.toISOString().substring(0, 10);
    } else {
      return null;
    }
  }

  canvas.addEventListener('click', (event) => {
    const bound = canvas.getBoundingClientRect();

    const x = event.clientX - bound.left - canvas.clientLeft;
    const y = event.clientY - bound.top - canvas.clientTop;

    const itemPixelWidth = 30;

    for (i = 0; i < xCoordinates.length; i++) {
      if (x > xCoordinates[i] && x < xCoordinates[i] + itemPixelWidth * 2) {
        if (x - xCoordinates[i] <= itemPixelWidth) {
          if (
            y > yCoordinates[i].started.yCoordinate &&
            y <
              yCoordinates[i].started.yCoordinate +
                yCoordinates[i].started.height
          ) {
            cardsTable.classList.add('visible');

            switch (chartGranularity) {
              case 'day':
                populateTable(cardsByDate[sortedDates[i]].started);
                break;
              case 'week':
                populateTable(cardsByWeek[sortedWeeks[i]].started);
                break;
              case 'month':
                populateTable(cardsByMonth[sortedMonths[i]].started);
                break;
              default:
                populateTable(cardsByDate[sortedDates[i]].started);
            }
          }
        } else {
          if (
            y > yCoordinates[i].ended.yCoordinate &&
            y < yCoordinates[i].ended.yCoordinate + yCoordinates[i].ended.height
          ) {
            cardsTable.classList.add('visible');

            switch (chartGranularity) {
              case 'day':
                populateTable(cardsByDate[sortedDates[i]].ended);
                break;
              case 'week':
                populateTable(cardsByWeek[sortedWeeks[i]].ended);
                break;
              case 'month':
                populateTable(cardsByMonth[sortedMonths[i]].ended);
                break;
              default:
                populateTable(cardsByDate[sortedDates[i]].ended);
            }
          }
        }
        break;
      } else if (
        x > xCoordinates[i] &&
        xCoordinates[i] + itemPixelWidth * 2 > x
      ) {
        console.log('out of bounds');
        break;
      }
    }
  });

  function populateTable(tableData) {
    let oldTbody = document.getElementById('cardsTableTbody');
    let newtableBody = document.createElement('tbody');
    newtableBody.setAttribute('id', 'cardsTableTbody');

    tableData.forEach((card) => {
      let row = newtableBody.insertRow();
      let titleCell = row.insertCell();
      let createdAtCell = row.insertCell(1);
      let startDateCell = row.insertCell(2);
      let endDateCell = row.insertCell(3);
      let priorityCell = row.insertCell(4);
      titleCell.textContent = card['Title'];
      createdAtCell.textContent = card['Created At'];
      startDateCell.textContent = card['Start Date'];
      endDateCell.textContent = card['End Date'];
      priorityCell.textContent = card['Priority'];
      row.appendChild(titleCell);
      row.appendChild(createdAtCell);
      row.appendChild(startDateCell);
      row.appendChild(endDateCell);
      row.appendChild(priorityCell);
      newtableBody.appendChild(row);
    });
    oldTbody.parentNode.replaceChild(newtableBody, oldTbody);
  }
})();
