import * as d3 from 'd3';

class WalkerSimulation {
    constructor() {
        this.nodes = new Map();
        this.events = [];
        this.currentTime = 0;
        this.isPlaying = false;
        this.speed = 1.0; // Default speed multiplier
        
        // Increase SVG size
        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        this.width = 900 - margin.left - margin.right;
        this.height = 800 - margin.top - margin.bottom;
        
        this.svg = d3.select("#visualization")
            .append("svg")
            .attr("width", this.width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
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

        // Set up controls
        this.setupControls();
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

        // Enhanced timeline slider
        timeline.addEventListener('input', (event) => {
            // While dragging
            this.isPlaying = false;
            playPauseBtn.textContent = "Play";
            this.currentTime = parseFloat(event.target.value);
            this.updateVisualization();
            timeLabel.textContent = this.currentTime.toFixed(1);
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
        
        // Add padding to the domain to prevent nodes from touching edges
        const xPadding = (maxX - minX) * 0.1; // 10% padding
        const yPadding = (maxY - minY) * 0.1;
        
        // Update scales based on data bounds with padding
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
        
        startLabel.textContent = minTime.toFixed(1);
        endLabel.textContent = maxTime.toFixed(1);
        
        // Update initial statistics
        document.querySelector('#total-events').textContent = this.events.length;
        
        // Sort events by timestamp
        this.events.sort((a, b) => a.time - b.time);
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
                        this.nodes.get(event.nodeId).x = event.x;
                        this.nodes.get(event.nodeId).y = event.y;
                        this.nodes.get(event.nodeId).lastUpdate = event.time;
                        this.nodes.get(event.nodeId).timeAtDest = event.timeAtDest;
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
            .attr("class", "walker");
            
        nodesEnter.append("circle")
            .attr("r", 5);
            
        nodesEnter.append("text")
            .attr("dx", 8)
            .attr("dy", 4)
            .style("font-size", "10px");
            
        // Update both new and existing nodes
        const nodesUpdate = nodesEnter.merge(nodes);
        
        nodesUpdate.attr("transform", d => 
            `translate(${this.xScale(d[1].x)},${this.yScale(d[1].y)})`
        );
        
        nodesUpdate.select("text")
            .text(d => d[1].id);
            
        // Remove old nodes
        nodes.exit().remove();

        // Update timeline slider position
        document.querySelector("#timeline").value = this.currentTime;
        document.querySelector("#currentTime").textContent = this.currentTime.toFixed(1);
    }

    animate() {
        if (!this.isPlaying) return;

        this.updateVisualization();

        // Update time display
        d3.select("#currentTime").text(this.currentTime.toFixed(1));

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
        
        // Initialize the visualization
        this.updateVisualization();
    }
}

// Export the class
export { WalkerSimulation }; 