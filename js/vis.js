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
        vis.chart = vis.svg.append("g").attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // active franchise (which franchise's franchise card is being displayed on screen)
        vis.active_franchise = null;

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

        let x0 = vis.x_scale(0);
        let y0 = vis.y_scale(0);

        // top right bg
        vis.svg.append("rect")
            .attr("x", x0)
            .attr("y", 0)
            .attr("width", vis.width - x0)
            .attr("height", y0)
            .attr("fill", quadColors.topRight);
        // top left bg
        vis.svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", x0)
            .attr("height", y0)
            .attr("fill", quadColors.topLeft);
        // bottom left bg
        vis.svg.append("rect")
            .attr("x", 0)
            .attr("y", y0)
            .attr("width", x0)
            .attr("height", vis.height - y0)
            .attr("fill", quadColors.bottomLeft);
        // bottom right bg
        vis.svg.append("rect")
            .attr("x", x0)
            .attr("y", y0)
            .attr("width", vis.width - x0)
            .attr("height", vis.height - y0)
            .attr("fill", quadColors.bottomRight);

        // set up bg labels
        vis.svg.append("text")
            .attr("x", vis.width - 120)
            .attr("y", 30)
            .attr("font-family", "Helvetica")
            .text("Thriving")
            .attr("fill", "green");
        vis.svg.append("text")
            .attr("x", 30)
            .attr("y", vis.height - 30)
            .attr("font-family", "Helvetica")
            .text("Decaying Critically & Commercially")
            .attr("fill", "red");
        vis.svg.append("text")
            .attr("x", 30)
            .attr("y", 30)
            .attr("font-family", "Helvetica")
            .text("Thriving Critically but Decaying Commercially")
            .attr("fill", "blue");
        vis.svg.append("text")
            .attr("x", vis.width - 320)
            .attr("y", vis.height - 30)
            .attr("font-family", "Helvetica")
            .text("Thriving Comercially but Decaying Critically")
            .attr("fill", '#fcba03');

        // Set up axis labels
        vis.svg.append("text")
            .attr("x", vis.width / 2)
            .attr("y", vis.height - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Sales Trend");
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Ratings Trend");

        let axis_x = d3.axisBottom(vis.x_scale)
        let axis_y = d3.axisLeft(vis.y_scale)
        vis.svg.append("g").attr("transform", `translate(0, ${vis.y_scale(0)})`).call((axis_x))
        vis.svg.append("g").attr("transform", `translate(${vis.x_scale(0)}, 0)`).call((axis_y))

        // Quadrant lines
        // Vertical line
        vis.svg.append("line")
            .attr("x1", vis.x_scale(0))
            .attr("x2", vis.x_scale(0))
            .attr("y1", vis.margin.top)
            .attr("y2", vis.height - vis.margin.bottom)
            .attr("stroke", "#333");
        // Horizontal Line
        vis.svg.append("line")
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
                vis.showFranchiseCard(data, event)
            })
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
        let width = 250;
        let height = 150;

        // store franchise history
        const history = data.franchise_history

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