var createDB = function () {
    var sqlLite = {};
    sqlLite.webdb = {};
    sqlLite.webdb.db = null;
    var tableName = 'Nutrients';
    var data;
    var currentDataSet = [];
    var dataTypes;
    var parcoords;
    var currentQuery = '';
    var currentSortedColumn = 'name';
    var currentSorting = 'asc';
    var hideAxisArray = ['name'];

    sqlLite.resultSet = [];
    sqlLite.allColumns = ['name', 'groups'];
    sqlLite.currentColumns = [];

    sqlLite.webdb.open = function() {
      var dbSize = 5 * 1024 * 1024; // 5MB
      //define the name, version, description and the size of the database.
      sqlLite.webdb.db = openDatabase("Nutrients_DB", "1.0", "Nutrient", dbSize);
    };

    sqlLite.webdb.createTable = function(columnsString) {
      var db = sqlLite.webdb.db;
      var query = "CREATE TABLE IF NOT EXISTS " + tableName + columnsString;
      db.transaction(function(tx) {
        tx.executeSql(query, [], sqlLite.webdb.onSuccess, sqlLite.webdb.onError);
      });
    };

    sqlLite.webdb.dropTable = function () {
        sqlLite.webdb.open();
        var db = sqlLite.webdb.db;

        db.transaction(function (tx) {
          tx.executeSql('DROP TABLE ' + tableName);
        });
    };

    sqlLite.webdb.setUpMaterialsTable = function(dataSet, types) {
        data = dataSet;
        dataTypes = types;

        sqlLite.webdb.open();
        var db = sqlLite.webdb.db;

        db.transaction(function(tx) {
            tx.executeSql("SELECT * FROM " + tableName, [], populateMaterialsTable,
                sqlLite.webdb.createAndPopulate);
        });
        createPropertiesFilter();
        createGroupFilter();
    };

    sqlLite.webdb.createAndPopulate = function () {
        console.log('here at create');
        var columns = '(';
        var firstDataItem = data[0];
        var types = [];
        Object.getOwnPropertyNames(firstDataItem).forEach(function(val, index) {
            if (columns === '(') {
                columns = columns + val.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct") + ' ' + dataTypes[0][val];
            } else {
                columns = columns + ', ' + val.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct") + ' ' + dataTypes[0][val];
            }
        });
        columns += ')';
        sqlLite.webdb.createTable(columns);
        populateMaterials();
    };

    createPropertiesFilter = function () {
        var firstDataItem = data[0];
        var propertyName, propertyValue;
        var removeProperties = ['name', 'groups'];
        var count = 2;
        Object.getOwnPropertyNames(firstDataItem).forEach(function(val, index) {
            if (removeProperties.indexOf(val) === -1) {
                propertyName = val;
                propertyValue = val.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct");
                sqlLite.allColumns[count] = propertyValue;
                count ++;
                $('#filter-properties').append('<option value="' + propertyValue + '">' + propertyName + '</option>');
            }
        });
    };

    createGroupFilter = function () {
        var groups = pluck(data, 'groups').filter(function(itm,i,a){
            return i==a.indexOf(itm);
        });
        groups.forEach(function(val, index) {
            $('#filter-group').append('<option value="' + val + '">' + val + '</option>');
        });
    };

    populateMaterialsTable = function (tx, rs) {
        if (rs.rows.length > 0) {
            return;
        } else {
            populateMaterials();
        }
    };

    populateMaterials = function() {
        console.log('here at populate');
        data.forEach(function(dataItem) {
            var columns = '(';
            var values = '(';
            Object.getOwnPropertyNames(dataItem).forEach(function(property, index) {
                if (columns === '(') {
                    columns = columns + property.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct");
                    values = values + '"' + dataItem[property] + '"';
                } else {
                    columns = columns + ', ' + property.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct");
                    values = values + ', "' + dataItem[property] + '"';
                }
            });
            columns += ')';
            values += ')';
            sqlLite.webdb.insertIntoTable(columns,values);
        });
    };

    sqlLite.webdb.insertIntoTable = function(columns, values) {
      var db = sqlLite.webdb.db;
      db.transaction(function(tx){
        tx.executeSql("INSERT INTO " + tableName + columns + " VALUES " + values, [],
            sqlLite.webdb.onSuccess,
            sqlLite.webdb.onError);
       });
    };

    sqlLite.webdb.onError = function(tx, e) {
      console.log("There has been an error: ", e);
    };

    sqlLite.webdb.onSuccess = function(tx, r) {
      // re-render the data.
      console.log('success!');
    };

    sqlLite.webdb.selectAll = function() {
      var db = sqlLite.webdb.db;
      var columns = sqlLite.allColumns.join(', ');
      sqlLite.currentColumns = sqlLite.allColumns;
      currentQuery = 'SELECT ' + columns + ' FROM ' + tableName;
      db.transaction(function(tx) {
        tx.executeSql(currentQuery + ' ORDER BY ' + currentSortedColumn + ' ' + currentSorting, [], createGraph,
            sqlLite.webdb.onError);
      });
    };

    sqlLite.webdb.selectQuery = function(query) {
        var db = sqlLite.webdb.db;
        currentQuery = query;
        query = query + ' ORDER BY ' + currentSortedColumn + ' ' + currentSorting;
        db.transaction(function(tx) {
            tx.executeSql(query, [], createGraph,
                sqlLite.webdb.onError);
        });
    };

    sqlLite.webdb.highlightQuery = function (query) {
        var db = sqlLite.webdb.db;
        db.transaction(function(tx) {
            tx.executeSql(query, [], highlightResult,
                sqlLite.webdb.onError);
        });
    };

    sqlLite.webdb.unHighlight = function () {
        parcoords.unhighlight();
    };

    sqlLite.webdb.sortTable = function (columnName, order) {
        currentSortedColumn = columnName;
        currentSorting = order;
        var db = sqlLite.webdb.db;
        var query = currentQuery + ' ORDER BY ' + columnName + ' ' + order;
        db.transaction(function(tx) {
            tx.executeSql(query, [], updateSortedTable,
                sqlLite.webdb.onError);
        });
    };

    var createGraph = function (tx, rs) {

        $('.result-count').text(rs.rows.length);

        var dataSet = [];
        for(var index=0; index < rs.rows.length; index++) {
          dataSet[index] = rs.rows.item(index);
        }

        currentDataSet = dataSet;

        sqlLite.webdb.drawGraph();
        createTable(dataSet);
    };

    sqlLite.webdb.changeHideAxes = function (axes) {
        hideAxisArray = axes;

        var colors = d3.scale.category20b();

        var color = function(d) {
            return colors(d['groups']);
        };

        parcoords = d3.parcoords()("#example-progressive")
          .data(currentDataSet)
          .hideAxis(hideAxisArray)
          .color(color)
          .alpha(0.25)
          .composite("darker")
          .margin({ top: 40, left: 150, bottom: 12, right: 0 })
          .mode("queue")
          .render()
          .brushMode("1D-axes");  // enable brushing

        parcoords.svg.selectAll("text")
          .style("font", "10px sans-serif");
    };

    sqlLite.webdb.drawGraph = function () {

        var colorInfo = [];
        var $infoBlock = $('#color-info');

        var colors = d3.scale.category10();

        var colorgen = d3.scale.ordinal()
          .range(["#a6cee3","#1f78b4","#b2df8a","#33a02c",
                  "#fb9a99","#e31a1c","#fdbf6f","#ff7f00",
                  "#cab2d6","#6a3d9a","#ffff99","#b15928"]);

        var color = function(d) {
          //console.log('colors of Processing Narrative: ', colors(d['Processing Narrative']));
          if (!colorInfo[d['groups']]) {
            colorInfo[d['groups']] = colors(d['groups']);
            $infoBlock.append('<li><span class="groupItemColor" style="background-color: ' + colors(d['groups']) + ';"></span> ' + d['groups'] +'</li>');
          }
          return colors(d['groups']);
        };

        parcoords = d3.parcoords()("#example-progressive")
          .data(currentDataSet)
          .hideAxis(hideAxisArray)
          .color(color)
          .alpha(0.25)
          .composite("darker")
          .margin({ top: 40, left: 150, bottom: 12, right: 0 })
          .mode("queue")
          .render()
          .brushMode("1D-axes");  // enable brushing

        parcoords.svg.selectAll("text")
          .style("font", "10px sans-serif");
    };

    var updateSortedTable = function (tx, rs) {
        var dataSet = [];
        for(var index=0; index < rs.rows.length; index++) {
          dataSet[index] = rs.rows.item(index);
        }

        createTable(dataSet);
    };

    var createTable = function (dataSet) {
        var firstDataItem = dataSet[0];
        var tableContent = '<tr>'
        var sortButton = '';
        var columnName = '';
        sqlLite.currentColumns.forEach(function(val, index) {
            columnName = val.replace(/ /g,"_").replace(/['():^-]/g,"").replace(/\//g,"by").replace(/%/g,"pct");
            sortButton = '<span class="sort-btn-block"><span class="sort-btn asc'
            if (val === currentSortedColumn && currentSorting === 'asc') {
                sortButton += ' selected';
            }
            sortButton += '" data-order="asc" data-column-name="' + columnName + '"></span>';
            sortButton += '<span class="sort-btn desc';
            if (val === currentSortedColumn && currentSorting === 'desc') {
                sortButton += ' selected';
            }
            sortButton += '" data-order="desc" data-column-name="' + columnName + '"></span></span>';
            tableContent = tableContent + '<th>' + val + sortButton +'</th>';
        });
        tableContent += '</tr>';
        var isOdd = true;
        dataSet.forEach(function(dataItem) {
            var rowClass = isOdd?'odd':'even';
            tableContent = tableContent + '<tr class="data-row ' + rowClass + '" data-name="' + dataItem['name'] + '">';
            isOdd = !isOdd;
            sqlLite.currentColumns.forEach(function(property, index) {
                tableContent = tableContent + '<td>' + dataItem[property] + '</td>';
            });
            tableContent = tableContent + '</tr>';
        });
        $('#results-table').html(tableContent);
    };

    var highlightResult = function (tx, rs) {
        var dataSet = [];
        for(var index=0; index < rs.rows.length; index++) {
          dataSet[index] = rs.rows.item(index);
        }
        parcoords.highlight(dataSet);
    };

    function pluck(array, key) {
      return array.map(function(item) { return item[key]; });
    }

    return sqlLite;
}
