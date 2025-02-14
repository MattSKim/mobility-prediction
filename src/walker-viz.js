import * as d3 from 'd3';

class WalkerSimulation {
    constructor() {
        this.nodes = new Map();
        this.events = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.speed = 1.0; // Default speed multiplier
        
        // Increase SVG size
        const margin = { top: 20, right: 20, bottom: 40, left: 10 };
        this.width = 700 - margin.left - margin.right;
        this.height = 700 - margin.top - margin.bottom;
        
        this.svg = d3.select("#visualization")
            .append("svg")
            .attr("width", "100%")    // Make SVG responsive
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + margin.left + margin.right} ${this.height + margin.top + margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
            
        // Create a group for the nodes and labels
        this.nodesGroup = this.svg.append("g");
            
        // We'll need to determine the actual bounds from the data
        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Timeline scale
        this.timeScale = d3.scaleLinear().range([0, this.width]);

        // Add this line to store start and end times
        this.timeRange = { start: 0, end: 0 };

        // Add selected node tracking
        this.selectedNode = null;

        // Add click handler to nodes
        this.svg.on('click', (event) => {
            if (event.target.tagName === 'svg' || event.target.tagName === 'g') {
                this.selectedNode = null;
                this.updateNodeInfo();
            }
        });

        // Update info container with dataset details
        const infoContainer = document.querySelector('.info-container');
        infoContainer.innerHTML = `
            <h2>Dataset Information</h2>
            <div class="info-section">
                <div class="info-label">Name</div>
                <div class="info-value">KTH Walkers Dataset</div>
            </div>
            <div class="info-section">
                <div class="info-label">Description</div>
                <div class="info-value">
                    The Ostermalm area consists of a grid of interconnected streets. 14 passages connect the observed area to the outside world. The active area of the outdoor scenario is 5872 m². 
                    The coordinates are measured in meters (m) relative to a local coordinate system of the observed area.

                    Throughout their lifetime, nodes are constantly moving in the observed area, therefore the scenario can be characterized as a high mobility scenario. Nodes enter the observed area according to a Poisson process with rate λ. 
                    The arrival rate λ represents the arrival rate at each of the fourteen passages in the area. The speed at which each node traverses the area is chosen from a truncated normal distribution (0.6;2.0) with a mean of 1.3 m/s.
                    
                    The traces in this traceset encompass arrival rates between 0.01 and 0.05 nodes/s.
                    The traces in this set capture mobility at a very fine granularity, namely the position of all observed nodes is recorded every 0.6 seconds.
                </div>
            </div>
            <div class="info-section">
                <div class="info-label">Parameters</div>
                <div class="info-value">
                    <ul>
                        <li>Arrival rate: λ = 0.01 nodes/s</li>
                        <li>Area: Downtown Stockholm (Ostermalm)</li>
                        <li>Recording duration: From t=0 with 0.6s measurement intervals</li>
                        <li>Dataset published: 2014-05-05</li>
                    </ul>
                </div>
            </div>
        `;

        // Add statistics and node details to controls container
        const controlsContainer = document.querySelector('.controls-container');
        
        // Create and append statistics section
        const statsSection = document.createElement('div');
        statsSection.className = 'info-section';
        statsSection.innerHTML = `
            <div class="info-label">Statistics</div>
            <div class="info-value" id="live-stats">
                Active nodes: <span id="active-nodes">0</span><br>
                Total events: <span id="total-events">0</span>
            </div>
        `;
        controlsContainer.appendChild(statsSection);

        // Create and append node details section
        const nodeDetailsSection = document.createElement('div');
        nodeDetailsSection.className = 'info-section';
        nodeDetailsSection.id = 'node-details';
        nodeDetailsSection.innerHTML = `
            <div class="info-label">Selected Node Details</div>
            <div class="info-value" id="node-info">
                <p class="no-selection">Click a node to see its details</p>
            </div>
        `;
        controlsContainer.appendChild(nodeDetailsSection);

        // Set up controls
        this.setupControls();

        // Add selected node tracking
        this.selectedNode = null;

        // Add click handler to nodes
        this.svg.on('click', (event) => {
            if (event.target.tagName === 'svg' || event.target.tagName === 'g') {
                this.selectedNode = null;
                this.updateNodeInfo();
            }
        });

        // Update info container to only show dataset information
        const infoContainer = document.querySelector('.info-container');
        infoContainer.innerHTML = `
            <h2>Dataset Information</h2>
            <div class="info-section">
                <div class="info-label">Name</div>
                <div class="info-value">KTH Walkers Dataset</div>
            </div>
            <div class="info-section">
                <div class="info-label">Description</div>
                <div class="info-value">
                    The Ostermalm area consists of a grid of interconnected streets. 14 passages connect the observed area to the outside world. The active area of the outdoor scenario is 5872 m². 
                    The coordinates are measured in meters (m) relative to a local coordinate system of the observed area.

                    Throughout their lifetime, nodes are constantly moving in the observed area, therefore the scenario can be characterized as a high mobility scenario. Nodes enter the observed area according to a Poisson process with rate λ. 
                    The arrival rate λ represents the arrival rate at each of the fourteen passages in the area. The speed at which each node traverses the area is chosen from a truncated normal distribution (0.6;2.0) with a mean of 1.3 m/s.
                    
                    The traces in this traceset encompass arrival rates between 0.01 and 0.05 nodes/s.
                    The traces in this set capture mobility at a very fine granularity, namely the position of all observed nodes is recorded every 0.6 seconds.
                </div>
            </div>
            <div class="info-section">
                <div class="info-label">Parameters</div>
                <div class="info-value">
                    <ul>
                        <li>Arrival rate: λ = 0.01 nodes/s</li>
                        <li>Area: Downtown Stockholm (Ostermalm)</li>
                        <li>Recording duration: From t=0 with 0.6s measurement intervals</li>
                        <li>Dataset published: 2014-05-05</li>
                    </ul>
                </div>
            </div>
        `;

        // Add statistics and node details to controls container
        const controlsContainer = document.querySelector('.controls-container');
        
        // Create and append statistics section
        const statsSection = document.createElement('div');
        statsSection.className = 'info-section';
        statsSection.innerHTML = `
            <div class="info-label">Statistics</div>
            <div class="info-value" id="live-stats">
                Active nodes: <span id="active-nodes">0</span><br>
                Total events: <span id="total-events">0</span>
            </div>
        `;
        controlsContainer.appendChild(statsSection);

        // Create and append node details section
        const nodeDetailsSection = document.createElement('div');
        nodeDetailsSection.className = 'info-section';
        nodeDetailsSection.id = 'node-details';
        nodeDetailsSection.innerHTML = `
            <div class="info-label">Selected Node Details</div>
            <div class="info-value" id="node-info">
                <p class="no-selection">Click a node to see its details</p>
            </div>
        `;
        controlsContainer.appendChild(nodeDetailsSection);
    }

    setupControls() {
        // Change how we select the timeline
        const timeline = document.querySelector("#timeline");
        const playPauseBtn = document.querySelector("#playPause");
        const speedInput = document.querySelector("#speed");
        const speedValue = document.querySelector("#speedValue");
        const timeLabel = document.querySelector("#currentTime");
        const endTimeLabel = document.querySelector("#endTime");
        
        // Play/Pause button
        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
            
        // Speed control
        speedInput.addEventListener('input', (event) => {
            this.speed = parseFloat(event.target.value);
            speedValue.textContent = this.speed.toFixed(1) + "x";
        });

        // Enhanced timeline slider with units
        timeline.addEventListener('input', (event) => {
            // While dragging
            this.isPlaying = false;
            playPauseBtn.textContent = "Play";
            this.currentTime = parseFloat(event.target.value);
            this.updateVisualization();
            timeLabel.textContent = this.currentTime.toFixed(1) + " s";
        });

        timeline.addEventListener('change', (event) => {
            // When drag ends
            this.currentTime = parseFloat(event.target.value);
            this.updateVisualization();
        });

        // Add keyboard shortcuts for timeline control
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case ' ': // Space bar
                    event.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.currentTime = Math.max(
                        this.timeRange.start, 
                        this.currentTime - (event.shiftKey ? 1.0 : 0.1)
                    );
                    this.updateVisualization();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.currentTime = Math.min(
                        this.timeRange.end, 
                        this.currentTime + (event.shiftKey ? 1.0 : 0.1)
                    );
                    this.updateVisualization();
                    break;
            }
        });
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        d3.select("#playPause").text(this.isPlaying ? "Pause" : "Play");
        if (this.isPlaying) {
            this.animate();
        }
    }

    async loadData(url) {
        const response = await fetch(url);
        const text = await response.text();
        
        // Parse the data
        const lines = text.split('\n');
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minTime = Infinity, maxTime = -Infinity;
        
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) return;
            
            const timestamp = parseFloat(parts[0]);
            minTime = Math.min(minTime, timestamp);
            maxTime = Math.max(maxTime, timestamp);
            
            const eventType = parts[1];
            
            if (eventType === 'create' || eventType === 'setdest') {
                const x = parseFloat(parts[3]);
                const y = parseFloat(parts[4]);
                
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                
                this.events.push({
                    time: timestamp,
                    type: eventType,
                    nodeId: parts[2],
                    x: x,
                    y: y,
                    ...(eventType === 'setdest' && {
                        speed: parseFloat(parts[6]),
                        timeAtDest: parseFloat(parts[7])
                    })
                });
            } else if (eventType === 'destroy') {
                this.events.push({
                    time: timestamp,
                    type: eventType,
                    nodeId: parts[2]
                });
            }
        });
        
        // Add minimal padding to the domain to keep nodes just inside borders
        const xPadding = (maxX - minX) * 0.05;  // Reduced from 0.25 to 0.05 (5% padding)
        const yPadding = (maxY - minY) * 0.05;  // Reduced from 0.25 to 0.05 (5% padding)
        
        // Update scales based on data bounds with minimal padding
        this.xScale.domain([minX - xPadding, maxX + xPadding]);
        this.yScale.domain([minY - yPadding, maxY + yPadding]);
        this.timeScale.domain([minTime, maxTime]);
        
        // Store time range
        this.timeRange = { start: minTime, end: maxTime };
        
        // Update timeline slider and labels
        const timeline = document.querySelector("#timeline");
        const startLabel = document.querySelector(".time-label");
        const endLabel = document.querySelector("#endTime");
        
        timeline.min = minTime;
        timeline.max = maxTime;
        timeline.step = 0.1;
        timeline.value = minTime;
        
        startLabel.textContent = minTime.toFixed(1) + " s";
        endLabel.textContent = maxTime.toFixed(1) + " s";
        
        // Update initial statistics
        document.querySelector('#total-events').textContent = this.events.length;
        
        // Sort events by timestamp
        this.events.sort((a, b) => a.time - b.time);
    }

    updateNodeInfo() {
        const nodeInfo = document.querySelector('#node-info');
        if (!this.selectedNode) {
            nodeInfo.innerHTML = '<p class="no-selection">Click a node to see its details</p>';
            return;
        }

        const node = this.nodes.get(this.selectedNode);
        if (!node) {
            nodeInfo.innerHTML = '<p class="no-selection">Selected node no longer exists</p>';
            return;
        }

        // Calculate speed if we have both current and destination positions
        let speed = 'N/A';
        if (node.speed) {
            speed = node.speed.toFixed(2);
        }

        nodeInfo.innerHTML = `
            <ul>
                <li>Node ID: ${node.id}</li>
                <li>Position: (${node.x.toFixed(2)}m, ${node.y.toFixed(2)}m)</li>
                <li>Speed: ${speed} m/s</li>
            </ul>
        `;
    }

    updateVisualization() {
        // Get all events up to current time to build node history
        const currentEvents = this.events.filter(e => e.time <= this.currentTime);
        
        // Reset nodes
        this.nodes.clear();
        
        // Track the last event time for each node
        const lastEventTimes = new Map();
        
        // Replay all events up to current time
        currentEvents.forEach(event => {
            lastEventTimes.set(event.nodeId, event.time);
            
            switch (event.type) {
                case 'create':
                    this.nodes.set(event.nodeId, {
                        x: event.x,
                        y: event.y,
                        id: event.nodeId,
                        lastUpdate: event.time
                    });
                    break;
                    
                case 'setdest':
                    if (this.nodes.has(event.nodeId)) {
                        const node = this.nodes.get(event.nodeId);
                        node.x = event.x;
                        node.y = event.y;
                        node.lastUpdate = event.time;
                        node.timeAtDest = event.timeAtDest;
                        node.speed = event.speed;
                    }
                    break;
                    
                case 'destroy':
                    this.nodes.delete(event.nodeId);
                    break;
            }
        });

        // Remove nodes that haven't been updated recently (30 seconds timeout)
        const timeout = 30; // seconds
        for (const [nodeId, nodeData] of this.nodes.entries()) {
            if (this.currentTime - nodeData.lastUpdate > timeout || 
                (nodeData.timeAtDest && this.currentTime > nodeData.timeAtDest)) {
                this.nodes.delete(nodeId);
            }
        }

        // Update statistics
        document.querySelector('#active-nodes').textContent = this.nodes.size;
        document.querySelector('#total-events').textContent = this.events.length;

        // Update visualization
        const nodeData = Array.from(this.nodes.entries());
        
        // Update nodes
        const nodes = this.nodesGroup.selectAll(".walker")
            .data(nodeData, d => d[0]);
            
        const nodesEnter = nodes.enter()
            .append("g")
            .attr("class", "walker")
            .on('click', (event, d) => {
                event.stopPropagation();
                this.selectedNode = d[0];
                
                // Immediately update all circles' selection state
                this.nodesGroup.selectAll("circle")
                    .attr("class", d => d[0] === this.selectedNode ? "selected" : "");
                    
                this.updateNodeInfo();
            });
            
        nodesEnter.append("circle")
            .attr("r", 5)
            .attr("class", d => d[0] === this.selectedNode ? "selected" : "")
            .on('click', (event, d) => {
                event.stopPropagation();
                this.selectedNode = d[0];
                
                // Immediately update all circles' selection state
                this.nodesGroup.selectAll("circle")
                    .attr("class", d => d[0] === this.selectedNode ? "selected" : "");
                    
                this.updateNodeInfo();
            });
            
        nodesEnter.append("text")
            .attr("dx", 8)
            .attr("dy", 4)
            .style("font-size", "10px");
            
        // Update both new and existing nodes
        const nodesUpdate = nodesEnter.merge(nodes);
        
        nodesUpdate.attr("transform", d => 
            `translate(${this.xScale(d[1].x)},${this.yScale(d[1].y)})`
        );
        
        nodesUpdate.select("circle")
            .attr("class", d => d[0] === this.selectedNode ? "selected" : "")
            .attr("r", d => d[0] === this.selectedNode ? 7 : 5);  // Make selected node bigger
        
        nodesUpdate.select("text")
            .text(d => d[1].id);
            
        nodesUpdate.select("circle")
            .attr("class", d => d[0] === this.selectedNode ? "selected" : "")
            .attr("r", d => d[0] === this.selectedNode ? 7 : 5);  // Make selected node bigger
            
        // Remove old nodes
        nodes.exit().remove();

        // Update timeline slider position
        document.querySelector("#timeline").value = this.currentTime;
        document.querySelector("#currentTime").textContent = this.currentTime.toFixed(1) + " s";

        if (this.selectedNode) {
            this.updateNodeInfo();  // Update node info every frame
        }
    }

    animate() {
        if (!this.isPlaying) return;

        this.updateVisualization();

        // Update time display
        d3.select("#currentTime").text(this.currentTime.toFixed(1) + " s");

        // Increase the base time step and multiply by speed
        this.currentTime += 0.5 * this.speed;  // Changed from 0.1 to 0.5
        
        if (this.currentTime <= this.events[this.events.length - 1].time) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isPlaying = false;
            d3.select("#playPause").text("Play");
        }
    }

    start() {
        this.currentTime = this.events[0].time;
        this.isPlaying = true;
        this.animate();
        d3.select("#playPause").text("Pause");
        
        // Initialize timeline labels with units
        document.querySelector(".time-label").textContent = "0.0 s";
        document.querySelector("#endTime").textContent = 
            this.events[this.events.length - 1].time.toFixed(1) + " s";
        
        // Initialize the visualization
        this.updateVisualization();

        // Update start time display
        document.querySelector(".time-label").textContent = "0.0 s";
        document.querySelector("#endTime").textContent = 
            this.events[this.events.length - 1].time.toFixed(1) + " s";
    }

    updateNodeInfo() {
        const nodeInfo = document.querySelector('#node-info');
        if (!this.selectedNode) {
            nodeInfo.innerHTML = '<p class="no-selection">Click a node to see its details</p>';
            return;
        }

        const node = this.nodes.get(this.selectedNode);
        if (!node) {
            nodeInfo.innerHTML = `
                <p class="no-selection">
                    Node ${this.selectedNode} has left the observation area
                </p>
            `;
            return;
        }

        // Calculate speed from the event data
        let speed = 'N/A';
        const currentEvents = this.events.filter(e => 
            e.time <= this.currentTime && 
            e.nodeId === this.selectedNode &&
            e.type === 'setdest'
        );
        if (currentEvents.length > 0) {
            const lastEvent = currentEvents[currentEvents.length - 1];
            speed = lastEvent.speed.toFixed(2);
        }

        nodeInfo.innerHTML = `
            <ul>
                <li>Node ID: ${node.id}</li>
                <li>Position: (${node.x.toFixed(2)}m, ${node.y.toFixed(2)}m)</li>
                <li>Speed: ${speed} m/s</li>
                <li>Status: Active</li>
            </ul>
        `;
    }
}

// Export the class
export { WalkerSimulation }; 