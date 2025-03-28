// Process management
let processes = [];
let ganttChartData = [];
const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const processIDInput = document.getElementById('processID');
    const arrivalTimeInput = document.getElementById('arrivalTime');
    const burstTimeInput = document.getElementById('burstTime');
    const priorityInput = document.getElementById('priority');
    const btnAddProcess = document.getElementById('btnAddProcess');
    const processListTable = document.getElementById('tblProcessList').getElementsByTagName('tbody')[0];
    const btnCalculate = document.getElementById('btnCalculate');
    const btnReset = document.getElementById('btnReset');
    const algorithmSelector = document.getElementById('algorithmSelector');
    const timeQuantumInput = document.getElementById('timeQuantum');
    const timeQuantumDiv = document.querySelector('.form-group-time-quantum');

    // Show/hide time quantum for Round Robin
    algorithmSelector.addEventListener('change', function() {
        if (this.value === 'optRR') {
            timeQuantumDiv.style.display = 'block';
        } else {
            timeQuantumDiv.style.display = 'none';
        }
    });

    // Add Process Button Click Handler
    btnAddProcess.addEventListener('click', function() {
        const processID = processIDInput.value;
        const arrivalTime = arrivalTimeInput.value;
        const burstTime = burstTimeInput.value;
        const priority = priorityInput.value;

        if (!processID || !burstTime) {
            alert('Please fill in Process ID and Burst Time');
            return;
        }

        // Check for duplicate Process ID
        if (processes.some(p => p.processID === parseInt(processID))) {
            alert('Process ID already exists');
            return;
        }

        const process = {
            processID: parseInt(processID),
            arrivalTime: parseInt(arrivalTime) || 0,
            burstTime: parseInt(burstTime),
            priority: parseInt(priority) || 0,
            remainingTime: parseInt(burstTime)
        };

        processes.push(process);
        
        // Add to table
        const row = processListTable.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">P${process.processID}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.arrivalTime}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.burstTime}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.priority}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button class="text-red-600 hover:text-red-900" onclick="removeProcess(${process.processID})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        `;

        // Clear inputs
        processIDInput.value = '';
        arrivalTimeInput.value = '';
        burstTimeInput.value = '';
        priorityInput.value = '';
    });

    // Reset Button Click Handler
    btnReset.addEventListener('click', function() {
        processes = [];
        ganttChartData = [];
        processListTable.innerHTML = '';
        document.getElementById('tblResults').getElementsByTagName('tbody')[0].innerHTML = '';
        document.getElementById('ganttChart').innerHTML = '';
        document.getElementById('avgTurnaroundTime').value = '';
        document.getElementById('avgWaitingTime').value = '';
        document.getElementById('throughput').value = '';
        document.getElementById('cpuUtilization').value = '';
        timeQuantumInput.value = '2'; // Reset time quantum to default value
    });

    // Calculate Button Click Handler
    btnCalculate.addEventListener('click', function() {
        if (processes.length === 0) {
            alert('Please add some processes first');
            return;
        }

        // Validate time quantum for Round Robin
        if (algorithmSelector.value === 'optRR') {
            const timeQuantum = parseInt(timeQuantumInput.value);
            if (!timeQuantum || timeQuantum < 1) {
                alert('Please enter a valid time quantum (minimum 1)');
                return;
            }
        }

        // Clear previous results
        document.getElementById('tblResults').getElementsByTagName('tbody')[0].innerHTML = '';
        document.getElementById('ganttChart').innerHTML = '';
        ganttChartData = [];

        const selectedAlgo = algorithmSelector.value;
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
});

// Function to remove process
function removeProcess(processID) {
    processes = processes.filter(p => p.processID !== processID);
    updateProcessTable();
}

// Function to update process table
function updateProcessTable() {
    const processListTable = document.getElementById('tblProcessList').getElementsByTagName('tbody')[0];
    processListTable.innerHTML = '';
    processes.forEach(process => {
        const row = processListTable.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">P${process.processID}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.arrivalTime}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.burstTime}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.priority}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button class="text-red-600 hover:text-red-900" onclick="removeProcess(${process.processID})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        `;
    });
}

// Rest of the scheduling algorithm functions remain the same
function firstComeFirstServed() {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
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

    while (processes.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
            readyQueue.push(processes.shift());
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

    while (completed.size < processes.length) {
        // Add arrived processes to ready queue
        processes.forEach(process => {
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
    const timeQuantum = parseInt(document.getElementById('timeQuantum').value) || 2;
    const completed = new Set();

    while (completed.size < processes.length) {
        // Add arrived processes to ready queue
        processes.forEach(process => {
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

    while (processes.length > 0 || readyQueue.length > 0) {
        // Add arrived processes to ready queue
        while (processes.length > 0 && processes[0].arrivalTime <= currentTime) {
            readyQueue.push(processes.shift());
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
        const row = document.getElementById('tblResults').getElementsByTagName('tbody')[0].insertRow();
        row.innerHTML = `
            <td class="border p-2">${process.processID}</td>
            <td class="border p-2">${process.arrivalTime}</td>
            <td class="border p-2">${process.burstTime}</td>
            <td class="border p-2">${process.priority}</td>
            <td class="border p-2">${process.completedTime}</td>
            <td class="border p-2">${process.waitingTime}</td>
            <td class="border p-2">${process.turnaroundTime}</td>
        `;

        totalWaitingTime += process.waitingTime;
        totalTurnaroundTime += process.turnaroundTime;
        maxCompletedTime = Math.max(maxCompletedTime, process.completedTime);
    });

    const avgWaitingTime = totalWaitingTime / results.length;
    const avgTurnaroundTime = totalTurnaroundTime / results.length;
    const throughput = results.length / maxCompletedTime;
    const cpuUtilization = (results.reduce((sum, p) => sum + p.burstTime, 0) / maxCompletedTime) * 100;

    document.getElementById('avgWaitingTime').value = avgWaitingTime.toFixed(2);
    document.getElementById('avgTurnaroundTime').value = avgTurnaroundTime.toFixed(2);
    document.getElementById('throughput').value = throughput.toFixed(2);
    document.getElementById('cpuUtilization').value = cpuUtilization.toFixed(2);
}

function displayGanttChart() {
    const chartContainer = document.getElementById('ganttChart');
    let currentTime = 0;

    ganttChartData.forEach(item => {
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.style.width = `${item.duration * 40}px`;
        bar.style.backgroundColor = colors[item.processID % colors.length];
        bar.style.marginLeft = `${(item.startTime - currentTime) * 40}px`;
        bar.textContent = `P${item.processID}`;
        bar.title = `Process ${item.processID}\nStart: ${item.startTime}\nDuration: ${item.duration}`;

        chartContainer.appendChild(bar);
        currentTime = item.startTime + item.duration;
    });

    // Add timeline
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    timeline.style.marginTop = '10px';

    for (let i = 0; i <= currentTime; i++) {
        const timeLabel = document.createElement('span');
        timeLabel.textContent = i;
        timeLabel.style.display = 'inline-block';
        timeLabel.style.width = '40px';
        timeLabel.style.textAlign = 'center';
        timeLabel.style.fontSize = '12px';
        timeline.appendChild(timeLabel);
    }

    chartContainer.appendChild(timeline);
}