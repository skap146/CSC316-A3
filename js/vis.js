// The prototype vis and it's methods
class Vis {
    constructor(parent_element, franchise_data) {
        let vis = this;

        // Store the visualization's parent element and data
        vis.parent_element = parent_element;
        vis.franchise_data = franchise_data;

        // Initialize the display data (to be created in wrangle data)
        vis.display_data = [];

        vis.initVis();
    }
    // Initialize visualization
    initVis() {
        let vis = this;
        // Create the svg area for the visualization, with appropriate margins
        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        vis.width = document.getElementById(vis.parent_element).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parent_element).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        console.log('width: ' + vis.width);
        console.log('height: ' + vis.height);

        // init drawing area
        vis.svg = d3.select("#" + vis.parent_element).append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height);

        // outer chart data
        vis.chart = vis.svg.append("g").attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);

        // active franchise (which franchise's franchise card is being displayed on screen)
        vis.active_franchise = null;

        // initialize current quadrant
        vis.current_quadrant = null;

        // create vertical and horizontal line
        vis.vertical_line = vis.chart.append("line")
            .attr("stroke", "#333");
        vis.horizontal_line = vis.chart.append("line")
            .attr("stroke", "#333");

        // create x and y axis labels
        vis.x_axis_label = vis.chart.append("text")
            .attr("class", "axis_label")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Sales Trend");

        vis.y_axis_label = vis.chart.append("text")
            .attr("class", "axis_label")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Ratings Trend");

        // check whether vis is zoomed
        vis.is_zoomed = false;

        // call wrangle data
        vis.wrangleData();


    }
    wrangleData() {
        // resets display_data (so items aren't being infinitely added to display_data every time
        // wrangleData() is called
        let vis = this;
        vis.display_data = [];

        // Group the data by franchise
        let grouped = d3.group(vis.franchise_data, data => data.Franchise)
        console.log(grouped);

        // Sort values in each franchise by year
        grouped.forEach((vals, key) => {
            vals.sort((a, b) => a.age - b.age);

            // Simple slope
            const x = vals.map(data => data.age);
            const y_rating = vals.map(data => data.average_rating)
            const y_sales = vals.map(data => data.total_franchise_sales)

            let rating_trend = slope(x, y_rating)
            let sales_trend = slope(x, y_sales)

            // Push data to display data
            vis.display_data.push({franchise: key,
                rating_trend: rating_trend,
                sales_trend: sales_trend,
                total_sales: d3.sum(vals, d => d.total_franchise_sales),
                franchise_history: vals})
        })

        console.log(vis.display_data)

        vis.updateVis();
    }
    updateVis() {
        let vis = this;

        // x and y scales
        vis.x_scale = d3.scaleLinear().domain(d3.extent(vis.display_data, d => d.sales_trend))
            .range([vis.margin.left, vis.width - vis.margin.right]);
        vis.y_scale = d3.scaleLinear().domain(d3.extent(vis.display_data, d => d.rating_trend))
            .range([vis.height - vis.margin.bottom, vis.margin.top]);

        // point size scale
        vis.size_scale = d3.scaleSqrt()
            .domain([0, d3.max(vis.display_data, d => d.total_sales)])
            .range([4, 15]);

        // quadrant colors
        const quadColors = {
            topRight: "#dff5e3",   // light green
            topLeft: "#dbe9ff",    // light blue
            bottomRight: "#fff4cc",// light yellow
            bottomLeft: "#f8d7da"  // light red
        };

        // add quadrant backgrounds
        vis.quadrants = vis.svg.selectAll(".quadrant")
            .data([
                {key: "topRight"},
                {key: "topLeft"},
                {key: "bottomLeft"},
                {key: "bottomRight"}
            ])
            .enter()
            .append("rect")
            .attr("class", "quadrant");

        // quadrant labels
        vis.labels = vis.svg.selectAll(".quad_headings")
            .data([
                {key: "topRight", text: "THRIVING", color: 'green'},
                {key: "topLeft", text: "LOW SALES", color: 'blue'},
                {key: "bottomLeft", text: "DECAYING", color: 'red'},
                {key: "bottomRight", text: "LOW RATINGS", color: '#838700'}
            ])
            .enter()
            .append("text")
            .attr("fill", d => d.color)
            .attr("class", "quad_headings")
            .attr("text-anchor", "middle");

        vis.renderQuadrants(quadColors);

        if (!vis.axis_group_x && !vis.axis_group_y) {
            vis.axis_group_x = vis.svg.append("g").attr("class", "x-axis")
            vis.axis_group_y = vis.svg.append("g").attr("class", "y-axis")
        }
        vis.updateAxes();

        // Quadrant lines
        // Vertical line
        vis.vertical_line
            .attr("x1", vis.x_scale(0))
            .attr("x2", vis.x_scale(0))
            .attr("y1", vis.margin.top)
            .attr("y2", vis.height - vis.margin.bottom)
            .attr("stroke", "#333");
        // Horizontal Line
        vis.horizontal_line
            .attr("x1", vis.margin.left)
            .attr("x2", vis.width - vis.margin.right)
            .attr("y1", vis.y_scale(0))
            .attr("y2", vis.y_scale(0))
            .attr("stroke", "#333");

        // Add points to vis
        vis.svg.selectAll("circle").
        data(vis.display_data)
            .enter()
            .append("circle")
            .attr("cx", d => {return vis.x_scale(d.sales_trend)})
            .attr("cy", d => {return vis.y_scale(d.rating_trend)})
            .attr("r", d => {return vis.size_scale(d.total_sales)})
            .attr("fill", d => {
                if (d.rating_trend < 0 && d.sales_trend < 0) {
                    return 'red'
                }
                else if (d.rating_trend >= 0 && d.sales_trend < 0) {
                    return 'blue'
                }
                else if (d.rating_trend < 0 && d.sales_trend >= 0) {
                    return '#fcba03'
                }
                else {
                    return 'green'
                }
            })
            .attr('stroke', '#333333')
            .attr('stroke-width', 1)
            .on('mouseover', function() {
                let circle = d3.select(this);
                let radius = circle.attr("r")
                circle.transition().duration(200).attr('stroke-width', 3).attr('r', radius * 1.2);

            })
            .on('mouseout', function() {
                let circle = d3.select(this);
                let radius = circle.attr("r")
                d3.select(this).transition().duration(200).attr('stroke-width', 1).attr('r', radius / 1.2);
            })
            .on('click', function(event, data) {
                // get the current quadrant and extent
                vis.current_quadrant = getQuadrant(data);
                const zoom = getZoomDomain(vis, vis.current_quadrant);

                // update elements
                if (!vis.is_zoomed) {
                    // update quadrants
                    vis.updateVis();
                    vis.zoomElements(zoom)
                    vis.is_zoomed = true;
                }

                // vis.showFranchiseCard(data, event)
            })
    }
    // renders quadrants
    renderQuadrants(quadColors) {
        let vis = this;
        let x0 = vis.x_scale(0);
        let y0 = vis.y_scale(0);

        if (vis.current_quadrant === null) {
            // NORMAL VIEW (4 quadrants)
            vis.svg.selectAll(".quadrant")
                .transition()
                .duration(750)
                .attr("x", d => {
                    if (d.key.includes("Right")) {
                        return x0;
                    }
                    else {
                        return 0;
                    }
                })
                .attr("y", d => {
                    if (d.key.includes("bottom")) {
                        return y0;
                    }
                    else {
                        return 0;
                    }
                })
                .attr("width", d => {
                    if (d.key.includes("Right")) {
                        return vis.width - x0;
                    }
                    else {
                        return x0;
                    }
                })
                .attr("height", d => {
                    if (d.key.includes("bottom")) {
                        return vis.height - y0;
                    }
                    else {
                        return y0;
                    }
                })
                .attr("fill", d => quadColors[d.key])
                .attr("opacity", 1);

            // QUAD HEADINGS
            vis.svg.selectAll(".quad_headings")
                .transition()
                .duration(750)
                .attr("x", d => {
                    if (d.key === "topRight" || d.key === "bottomRight") {
                        return (vis.x_scale(0) + vis.width) / 2;
                    } else {
                        return vis.x_scale(0) / 2;
                    }
                })
                .attr("y", d => {
                    if (d.key === "bottomLeft" || d.key === "bottomRight") {
                        return (vis.y_scale(0) + vis.height) / 2;
                    } else {
                        return vis.y_scale(0) / 2;
                    }
                })
                .text(d => d.text);
        }
        else {
            // ZOOMED VIEW (ONE quadrant fills screen)
            vis.svg.selectAll(".quadrant")
                .transition()
                .duration(750)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", vis.width)
                .attr("height", vis.height)
                .attr("fill", d => {
                    if (d.key === vis.current_quadrant) {
                        return quadColors[d.key];
                    }
                    else
                    {
                        return "none";
                    }})
                .attr("opacity", d => {
                    if (d.key === vis.current_quadrant) {
                        return 1;
                    }
                    else
                    {
                        return 0;
                    }});

            // QUAD HEADINGS
            vis.svg.selectAll(".quad_headings")
                .transition()
                .duration(750)
                .attr("x", d => {
                    if (d.key === vis.current_quadrant) {
                        return vis.width / 2;
                    }
                    else {
                        return -1000;
                    }
                })
                .attr("y", d => {
                    if (d.key === vis.current_quadrant) {
                        return vis.height / 2;
                    }
                    else {
                        return -1000;
                    }
                })
                .text(d => d.text);
        }
    }
    // shows details within a particular franchise
    showFranchiseCard(data, event) {
        // select the pop-up element
        let vis = this;

        // toggle display settings
        if (vis.active_franchise === data.franchise){
            vis.active_franchise = null;
            vis.franchise_card.transition().duration(500).style("opacity", 0).style("pointer-events", "none");
            return;
        }
        else {
            vis.active_franchise = data.franchise;
        }

        // create the franchise card
        vis.franchise_card = d3.select('#detailed-popup-card')

        // clear previous html
        vis.franchise_card.html("");

        // create the svg for the franchise card
        let width = 700;
        let height = 550;

        // store franchise history
        const history = data.franchise_history;

        // Create inner visualization svg
        const card_svg = vis.franchise_card.append("svg").attr("width", width).attr("height", height);
        const margin = { top: 20, right: 40, bottom: 30, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const chart = card_svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // x and y scales
        const x_scale = d3.scaleLinear()
            .domain(d3.extent(history, d => d.age))
            .range([0, innerWidth]);

        const y_rating_scale = d3.scaleLinear()
            .domain(d3.extent(history, d => d.average_rating))
            .range([innerHeight, 0]);
        const y_sales_scale = d3.scaleLinear()
            .domain(d3.extent(history, d => d.total_franchise_sales))
            .range([innerHeight, 0]);

        // axis
        const num_ticks = 4;
        const x_axis = d3.axisBottom(x_scale).ticks(num_ticks);
        const y_rating_axis = d3.axisLeft(y_rating_scale).ticks(num_ticks);
        const y_sales_axis = d3.axisRight(y_sales_scale).ticks(num_ticks);
        vis.updateAxes()

        // append all axes to chart
        chart.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(x_axis);
        chart.append("g")
            .call(y_rating_axis);
        chart.append("g")
            .attr("transform", `translate(${innerWidth}, 0)`)
            .call(y_sales_axis);

        // line generation
        const ratingLine = d3.line()
            .x(d => x_scale(d.age))
            .y(d => y_rating_scale(d.average_rating));
        const salesLine = d3.line()
            .x(d => x_scale(d.age))
            .y(d => y_sales_scale(d.total_franchise_sales));

        // Ratings (blue)
        chart.append("path")
            .datum(history)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", ratingLine);

        // Sales (orange)
        chart.append("path")
            .datum(history)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 2)
            .attr("d", salesLine);

        // Rating dots
        chart.selectAll(".rating-dot")
            .data(history)
            .enter()
            .append("circle")
            .attr("class", "rating-dot")
            .attr("cx", d => x_scale(d.age))
            .attr("cy", d => y_rating_scale(d.average_rating))
            .attr("r", 3)
            .attr("fill", "steelblue");
        // Sales dots
        chart.selectAll(".sales-dot")
            .data(history)
            .enter()
            .append("circle")
            .attr("class", "sales-dot")
            .attr("cx", d => x_scale(d.age))
            .attr("cy", d => y_sales_scale(d.total_franchise_sales))
            .attr("r", 3)
            .attr("fill", "orange");
        //
        // // Add a slider (show trendline toggle or not)
        // const slider = vis.franchise_card.append("label")
        //     .attr("class", "switch")
        //     .style("position", "absolute")
        //     .style("right", "10px")
        //     .style("bottom", "10px");

        // slider.html(`<label class="switch" id="slider_toggle">
        //     <input type="checkbox">
        //         <span class="slider round"></span>
        // </label>`);

        // // Add a slider label
        // vis.franchise_card.append("div")
        //     .style("position", "absolute")
        //     .style("font-weight", "bold")
        //     .style("margin-bottom", "10px")
        //     .style("margin-left", "500px")
        //     .style("font-size", "8px")
        //     .text('Show Line: ')

        // Axis titles
        chart.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Years Since Franchise Inception");
        chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -margin.left + 12)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Rating (/100)");
        chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", innerWidth + margin.right - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Sales (in Millions of Units)");


        // add the title
        vis.franchise_card.append("div")
            .style("font-weight", "bold")
            .style("margin-bottom", "8px")
            .text(data.franchise)

        // position the popup
        vis.franchise_card
            .style("left", (event.clientX + 10) + "px")
            .style("top", (event.clientY - 10) + "px")
            .transition()
            .duration(500)
            .style("opacity", 1)
            .style("pointer-events", "auto");

        console.log(getComputedStyle(document.getElementById("vis-area")).transform)
    }
    zoomElements(zoom) {
        let vis = this;

        vis.x_scale.domain(zoom.x);
        console.log(vis.x_scale.domain())
        vis.y_scale.domain(zoom.y);

        // animate everything
        vis.svg.transition().duration(750);

        let circles = vis.svg.selectAll("circle")
        let circlesEnter = circles.enter()

        circlesEnter.merge(circles)
            .transition()
            .duration(750)
            .attr("cx", d => vis.x_scale(d.sales_trend))
            .attr("cy", d => vis.y_scale(d.rating_trend))
            .attr("display", d => {
            const cx = vis.x_scale(d.sales_trend);
            const cy = vis.y_scale(d.rating_trend);

            if ((vis.margin.left <= cx) && (cx <= vis.width - vis.margin.right) && (vis.margin.top <= cy) && (cy <= vis.height - vis.margin.bottom)) {
                return '';

            }
            else {
                return 'none';
            }
        })

        // update axis labels
        vis.updateAxes()
    }
    updateAxes() {
        let vis = this;

        // create positioning and axes variables
        let x_pos, y_pos;
        let x_axis, y_axis;

        // create axis label positioning variables
        let x_label_x;
        let x_label_y;
        let y_label_x;
        let y_label_y;
        let y_label_rotation = -90;

        const isFull = !vis.current_quadrant;
        const isTop = vis.current_quadrant && vis.current_quadrant.includes('top');
        const isRight = vis.current_quadrant && vis.current_quadrant.includes('Right');
        const right_tick_values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
        const left_tick_values = [-0.8, -0.6, -0.4, -0.2, 0.0]
        const top_tick_values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4]
        const bottom_tick_values = [-1.4, -1.2, -1.0, -0.8, -0.6, -0.4, -0.2, -0.0]

        // all four quadrants visible
        if (isFull) {
            x_axis = d3.axisTop(vis.x_scale);
            x_pos = vis.y_scale(0);
            y_axis = d3.axisRight(vis.y_scale);
            y_pos = vis.x_scale(0);

            x_label_y = x_pos + 40;
            x_label_x = vis.width * 0.75;
            y_label_x = y_pos + 50;
            y_label_y = vis.height * 0.25;
        }
        // zoomed in case
        else {
            // top right
            if (isTop && isRight) {
                x_label_x = vis.width * 0.75;
                x_label_y = vis.height * 0.52;

                y_label_x = -vis.height * 0.15;
                y_label_y = vis.width * 0.4;

                x_axis = d3.axisTop(vis.x_scale).tickValues(right_tick_values);
                x_pos = vis.y_scale(0);
                y_axis = d3.axisRight(vis.y_scale).tickValues(top_tick_values);
                y_pos = vis.x_scale(0);
            }
            // top left
            else if (isTop && !isRight) {
                x_label_x = vis.width * 0.3;
                x_label_y = vis.height * 0.85;

                y_label_x = -vis.height * 0.3;
                y_label_y = vis.width * 0.85;

                x_axis = d3.axisTop(vis.x_scale).tickValues(left_tick_values);
                x_pos = vis.y_scale(0);
                y_axis = d3.axisLeft(vis.y_scale).tickValues(top_tick_values);
                y_pos = vis.x_scale(vis.x_scale.domain()[1]);
            }
            // bottom right
            else if (!isTop && isRight) {
                x_label_x = vis.width * 0.7;
                x_label_y = vis.height * 0.2;

                y_label_x = -vis.height * 0.7;
                y_label_y = vis.width * 0.15;

                x_axis = d3.axisBottom(vis.x_scale).tickValues(right_tick_values);
                x_pos = vis.y_scale(vis.y_scale.domain()[1]);
                y_axis = d3.axisRight(vis.y_scale).tickValues(bottom_tick_values);
                y_pos = vis.x_scale(0);
            }
            // bottom left
            else {
                x_label_x = vis.width * 0.3;
                x_label_y = vis.height * 0.2;

                y_label_x = -vis.height * 0.7;
                y_label_y = vis.width * 0.85;

                x_axis = d3.axisBottom(vis.x_scale).tickValues(left_tick_values);
                x_pos = vis.y_scale(vis.y_scale.domain()[1]);
                y_axis = d3.axisLeft(vis.y_scale).tickValues(bottom_tick_values);
                y_pos = vis.x_scale(0);
            }
        }

        // move the axis text so it doesn't overlap with axis lines
        if (!isRight) {
            if (isTop) {
                vis.axis_group_y.selectAll(".tick text")
                    .attr("dx", "-1.2em");
            }
            else {
                vis.axis_group_y.selectAll(".tick text")
                    .attr("dx", "-1.8em");
            }
        }
        if (!isTop) {
            vis.axis_group_x.selectAll(".tick text")
                .attr("dy", "0.5em");
        }


        // pixel snapping
        x_pos = Math.round(x_pos);
        y_pos = Math.round(y_pos);

        // apply
        vis.axis_group_x
            .transition().duration(750)
            .attr("transform", `translate(0, ${x_pos})`)
            .call(x_axis);

        vis.axis_group_y
            .transition().duration(750)
            .attr("transform", `translate(${y_pos}, 0)`)
            .call(y_axis);

        // update axis lines
        vis.vertical_line
            .transition().duration(750)
            .attr("x1", y_pos)
            .attr("x2", y_pos);

        vis.horizontal_line
            .transition().duration(750)
            .attr("y1", x_pos)
            .attr("y2", x_pos);

        vis.x_axis_label
            .transition()
            .duration(750)
            .attr("x", x_label_x)
            .attr("y", x_label_y);

        vis.x_axis_label.raise();

        console.log(vis.x_axis_label);
        // rotate on
        // vis.y_axis_label
        //     .transition()
        //     .duration(750)
        //     .attr("transform", `translate(${y_label_y}, ${y_label_x}) rotate(-90)`)
        // rotate off
        vis.y_axis_label
            .transition()
            .duration(750)
            .attr("transform", `translate(${y_label_y}, ${y_label_x})`)

        vis.y_axis_label.raise();
    }
}
// Produce a slope
function slope(x, y) {
    let x_mean = d3.mean(x)
    let y_mean = d3.mean(y)

    let num = d3.sum(x.map((xi, i) => (xi - x_mean) * (y[i] - y_mean)));
    let den = d3.sum(x.map(xi => (xi - x_mean) ** 2));

    // return slope only if deltax != 0
    if (den === 0) {
        return 0
    }
    else {
        return num / den;
    }

}

// Obtain the current quadrant
function getQuadrant(d) {
    if (d.rating_trend < 0 && d.sales_trend < 0) return "bottomLeft";   // red
    if (d.rating_trend >= 0 && d.sales_trend < 0) return "topLeft";     // blue
    if (d.rating_trend < 0 && d.sales_trend >= 0) return "bottomRight"; // yellow
    return "topRight"; // green
}
// Get the zoomed in domain
function getZoomDomain(vis, quadrant) {
    const xExtent = d3.extent(vis.display_data, d => d.sales_trend);
    const yExtent = d3.extent(vis.display_data, d => d.rating_trend);

    const xMid = 0;
    const yMid = 0;

    if (quadrant === "topRight") {
        return { x: [xMid, xExtent[1]], y: [yMid, yExtent[1]] };
    }
    if (quadrant === "topLeft") {
        return { x: [xExtent[0], xMid], y: [yMid, yExtent[1]] };
    }
    if (quadrant === "bottomRight") {
        return { x: [xMid, xExtent[1]], y: [yExtent[0], yMid] };
    }
    if (quadrant === "bottomLeft") {
        return { x: [xExtent[0], xMid], y: [yExtent[0], yMid] };
    }
}