$(document).ready(
    function(){
        $(".form-group-time-quantum").hide();

        // Show hide RR time quantum
        $('#algorithmSelector').on('change', function(){
            if(this.value === 'optRR') {
                $(".form-group-time-quantum").show(1000);
            } else {
                $(".form-group-time-quantum").hide(1000);
            }
        });

        let processList = [];
        let ganttChartData = [];
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

        $('#btnAddProcess').on('click', function(){
            const processID = $('#processID');
            const arrivalTime = $('#arrivalTime');
            const burstTime = $('#burstTime');
            const priority = $('#priority');

            if (processID.val() === '' || arrivalTime.val() === '' || burstTime.val() === '') {
                alert('Please fill in all required fields');
                return;
            }

            const process = {
                processID: parseInt(processID.val()),
                arrivalTime: parseInt(arrivalTime.val()),
                burstTime: parseInt(burstTime.val()),
                priority: priority.val() ? parseInt(priority.val()) : 0,
                remainingTime: parseInt(burstTime.val())
            };

            processList.push(process);
            
            $('#tblProcessList > tbody').append(
                `<tr>
                    <td>${process.processID}</td>
                    <td>${process.arrivalTime}</td>
                    <td>${process.burstTime}</td>
                    <td>${process.priority}</td>
                    <td>
                        <button class="btn btn-danger btn-sm delete-process">Delete</button>
                    </td>
                </tr>`
            );

            // Clear inputs
            processID.val('');
            arrivalTime.val('');
            burstTime.val('');
            priority.val('');
        });

        // Delete process from the list
        $(document).on('click', '.delete-process', function() {
            const index = $(this).closest('tr').index();
            processList.splice(index, 1);
            $(this).closest('tr').remove();
        });

        // Reset button
        $('#btnReset').on('click', function() {
            processList = [];
            ganttChartData = [];
            $('#tblProcessList > tbody').empty();
            $('#tblResults > tbody').empty();
            $('#ganttChart').empty();
            $('#avgTurnaroundTime').val('');
            $('#avgWaitingTime').val('');
            $('#throughput').val('');
            $('#cpuUtilization').val('');
        });

        $('#btnCalculate').on('click', function(){
            if (processList.length === 0) {
                alert('Please add some processes first');
                return;
            }

            // Clear previous results
            $('#tblResults > tbody').empty();
            $('#ganttChart').empty();
            ganttChartData = [];

            const selectedAlgo = $('#algorithmSelector').val();
            let results;

            switch(selectedAlgo) {
                case 'optFCFS':
                    results = firstComeFirstServed();
                    break;
                case 'optSJF':
                    results = shortestJobFirst();
                    break;
                case 'optSRTF':
                    results = shortestRemainingTimeFirst();
                    break;
                case 'optRR':
                    results = roundRobin();
                    break;
                case 'optPriority':
                    results = priorityScheduling();
                    break;
            }

            displayResults(results);
            displayGanttChart();
        });

        function firstComeFirstServed() {
            const sortedProcesses = [...processList].sort((a, b) => a.arrivalTime - b.arrivalTime);
            const results = [];
            let currentTime = 0;

            sortedProcesses.forEach(process => {
                if (currentTime < process.arrivalTime) {
                    currentTime = process.arrivalTime;
                }

                const startTime = currentTime;
                currentTime += process.burstTime;

                results.push({
                    ...process,
                    startTime,
                    completedTime: currentTime,
                    waitingTime: startTime - process.arrivalTime,
                    turnaroundTime: currentTime - process.arrivalTime
                });

                ganttChartData.push({
                    processID: process.processID,
                    startTime,
                    duration: process.burstTime
                });
            });

            return results;
        }

        function shortestJobFirst() {
            const results = [];
            let currentTime = 0;
            const readyQueue = [];

            while (processList.length > 0 || readyQueue.length > 0) {
                // Add arrived processes to ready queue
                while (processList.length > 0 && processList[0].arrivalTime <= currentTime) {
                    readyQueue.push(processList.shift());
                }

                if (readyQueue.length === 0) {
                    currentTime++;
                    continue;
                }

                // Sort by burst time and get shortest job
                readyQueue.sort((a, b) => a.burstTime - b.burstTime);
                const process = readyQueue.shift();

                const startTime = currentTime;
                currentTime += process.burstTime;

                results.push({
                    ...process,
                    startTime,
                    completedTime: currentTime,
                    waitingTime: startTime - process.arrivalTime,
                    turnaroundTime: currentTime - process.arrivalTime
                });

                ganttChartData.push({
                    processID: process.processID,
                    startTime,
                    duration: process.burstTime
                });
            }

            return results;
        }

        function shortestRemainingTimeFirst() {
            const results = [];
            let currentTime = 0;
            const readyQueue = [];
            const completed = new Set();

            while (completed.size < processList.length) {
                // Add arrived processes to ready queue
                processList.forEach(process => {
                    if (!completed.has(process.processID) && process.arrivalTime <= currentTime) {
                        if (!readyQueue.find(p => p.processID === process.processID)) {
                            readyQueue.push({...process});
                        }
                    }
                });

                if (readyQueue.length === 0) {
                    currentTime++;
                    continue;
                }

                // Sort by remaining time and get shortest job
                readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
                const process = readyQueue[0];

                const startTime = currentTime;
                currentTime++;
                process.remainingTime--;

                ganttChartData.push({
                    processID: process.processID,
                    startTime,
                    duration: 1
                });

                if (process.remainingTime === 0) {
                    readyQueue.shift();
                    completed.add(process.processID);
                    results.push({
                        ...process,
                        startTime,
                        completedTime: currentTime,
                        waitingTime: currentTime - process.arrivalTime - process.burstTime,
                        turnaroundTime: currentTime - process.arrivalTime
                    });
                }
            }

            return results;
        }

        function roundRobin() {
            const results = [];
            let currentTime = 0;
            const readyQueue = [];
            const timeQuantum = parseInt($('#timeQuantum').val());
            const completed = new Set();

            while (completed.size < processList.length) {
                // Add arrived processes to ready queue
                processList.forEach(process => {
                    if (!completed.has(process.processID) && process.arrivalTime <= currentTime) {
                        if (!readyQueue.find(p => p.processID === process.processID)) {
                            readyQueue.push({...process});
                        }
                    }
                });

                if (readyQueue.length === 0) {
                    currentTime++;
                    continue;
                }

                const process = readyQueue.shift();
                const startTime = currentTime;
                const executionTime = Math.min(timeQuantum, process.remainingTime);
                currentTime += executionTime;
                process.remainingTime -= executionTime;

                ganttChartData.push({
                    processID: process.processID,
                    startTime,
                    duration: executionTime
                });

                if (process.remainingTime === 0) {
                    completed.add(process.processID);
                    results.push({
                        ...process,
                        startTime,
                        completedTime: currentTime,
                        waitingTime: currentTime - process.arrivalTime - process.burstTime,
                        turnaroundTime: currentTime - process.arrivalTime
                    });
                } else {
                    readyQueue.push(process);
                }
            }

            return results;
        }

        function priorityScheduling() {
            const results = [];
            let currentTime = 0;
            const readyQueue = [];

            while (processList.length > 0 || readyQueue.length > 0) {
                // Add arrived processes to ready queue
                while (processList.length > 0 && processList[0].arrivalTime <= currentTime) {
                    readyQueue.push(processList.shift());
                }

                if (readyQueue.length === 0) {
                    currentTime++;
                    continue;
                }

                // Sort by priority (lower number = higher priority)
                readyQueue.sort((a, b) => a.priority - b.priority);
                const process = readyQueue.shift();

                const startTime = currentTime;
                currentTime += process.burstTime;

                results.push({
                    ...process,
                    startTime,
                    completedTime: currentTime,
                    waitingTime: startTime - process.arrivalTime,
                    turnaroundTime: currentTime - process.arrivalTime
                });

                ganttChartData.push({
                    processID: process.processID,
                    startTime,
                    duration: process.burstTime
                });
            }

            return results;
        }

        function displayResults(results) {
            let totalWaitingTime = 0;
            let totalTurnaroundTime = 0;
            let maxCompletedTime = 0;

            results.forEach(process => {
                $('#tblResults > tbody').append(
                    `<tr>
                        <td>${process.processID}</td>
                        <td>${process.arrivalTime}</td>
                        <td>${process.burstTime}</td>
                        <td>${process.priority}</td>
                        <td>${process.completedTime}</td>
                        <td>${process.waitingTime}</td>
                        <td>${process.turnaroundTime}</td>
                    </tr>`
                );

                totalWaitingTime += process.waitingTime;
                totalTurnaroundTime += process.turnaroundTime;
                maxCompletedTime = Math.max(maxCompletedTime, process.completedTime);
            });

            const avgWaitingTime = totalWaitingTime / results.length;
            const avgTurnaroundTime = totalTurnaroundTime / results.length;
            const throughput = results.length / maxCompletedTime;
            const cpuUtilization = (results.reduce((sum, p) => sum + p.burstTime, 0) / maxCompletedTime) * 100;

            $('#avgWaitingTime').val(avgWaitingTime.toFixed(2));
            $('#avgTurnaroundTime').val(avgTurnaroundTime.toFixed(2));
            $('#throughput').val(throughput.toFixed(2));
            $('#cpuUtilization').val(cpuUtilization.toFixed(2));
        }

        function displayGanttChart() {
            const chartContainer = $('#ganttChart');
            let currentTime = 0;

            ganttChartData.forEach(item => {
                const bar = $('<div>')
                    .addClass('gantt-bar')
                    .css({
                        'width': `${item.duration * 40}px`,
                        'background-color': colors[item.processID % colors.length],
                        'margin-left': `${(item.startTime - currentTime) * 40}px`
                    })
                    .text(`P${item.processID}`)
                    .attr('title', `Process ${item.processID}\nStart: ${item.startTime}\nDuration: ${item.duration}`);

                chartContainer.append(bar);
                currentTime = item.startTime + item.duration;
            });

            // Add timeline
            const timeline = $('<div>')
                .addClass('timeline')
                .css('margin-top', '10px');

            for (let i = 0; i <= currentTime; i++) {
                timeline.append(
                    $('<span>')
                        .text(i)
                        .css({
                            'display': 'inline-block',
                            'width': '40px',
                            'text-align': 'center',
                            'font-size': '12px'
                        })
                );
            }

            chartContainer.append(timeline);
        }    
    }
);