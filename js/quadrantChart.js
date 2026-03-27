class QuadrantChart {
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
            .attr("height", vis.height)
            .append("g")
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);

        // active franchise (which franchise's franchise card is being displayed on screen)
        vis.active_franchise = null;

        // initialize current quadrant
        vis.current_quadrant = null;

        // create x and y axis labels
        vis.x_axis_label = vis.svg.append("text")
            .attr("class", "axis_label")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Sales Trend");
        vis.y_axis_label = vis.svg.append("text")
            .attr("class", "axis_label")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .text("Ratings Trend");

        // check whether vis is zoomed
        vis.is_zoomed = false;

        // franchise to image mappings
        vis.franchise_to_img =
            {'Mario': 'img/Mario.png',
            'The Legend of Zelda': 'img/Zelda.png',
            'Pokemon': 'img/Pokemon.png',
            'Kirby': 'img/Kirby.png',
            'Final Fantasy': 'img/Final Fantasy.png',
            'Resident Evil': 'img/Resident Evil.png',
            "Assassin's Creed": "img/Assassin's Creed.png",
            'Forza': 'img/Forza.png',
            'Gears': 'img/Gears.png',
            'God of War': 'img/God of War.png',
            'Sonic': 'img/Sonic.png',
            'Tomb Raider': 'img/Tomb Raider.png',
            'Grand Theft Auto': 'img/Grand Theft Auto.png',
            'FIFA': 'img/FiFA.png',
            'Monster Hunter': 'img/Monster Hunter.png',
                'Call of Duty': 'img/Call of Duty.png',
                'Diablo': 'img/Diablo.png',
                'Street Fighter': 'img/Street Fighter.png',
                'The Elder Scrolls': 'img/The Elder Scrolls.png',
                'Halo': 'img/Halo.png',
            };

        // whether or not to display trendlines on the charts
        vis.display_trendlines = true;

        // react to zoom out btn
        const zoom_out_btn = document.getElementById('zoom-out-btn')
        zoom_out_btn.addEventListener('click', function(event) {
            // set current quadrant to null and zoom out
            vis.current_quadrant = null;
            vis.is_zoomed = false;
            vis.zoomElements(getZoomDomain(vis, vis.current_quadrant));
            vis.updateAxes();
            vis.engulfQuadrants();
        })
        // react to show/hide trendlines btn
        const trendlines_btn = document.getElementById('trendlines-btn')
        trendlines_btn.addEventListener('click', function() {
            if (trendlines_btn.textContent === 'HIDE TRENDLINES!') {
                trendlines_btn.textContent = 'SHOW TRENDLINES!';
                vis.display_trendlines = false;
            }
            else {
                trendlines_btn.textContent = 'HIDE TRENDLINES!';
                vis.display_trendlines = true;
            }
        })

        // call wrangle data
        vis.wrangleData();
    }
    wrangleData() {
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
                icon: vis.franchise_to_img[key],
                franchise_history: vals})
        })

        console.log(vis.display_data)

        vis.updateVis();
    }
    updateVis() {
        let vis = this;

        // point size scale
        vis.size_scale = d3.scaleSqrt()
            .domain([0, d3.max(vis.display_data, d => d.total_sales)])
            .range([4, 15]);
        // compute max radius for padding
        const max_radius = d3.max(vis.display_data, d => vis.size_scale(d.total_sales));

        // x and y scales
        vis.x_scale = d3.scaleLinear().domain(d3.extent(vis.display_data, d => d.sales_trend))
            .range([vis.margin.left + max_radius, vis.width - vis.margin.right - max_radius]);
        vis.y_scale = d3.scaleLinear().domain(d3.extent(vis.display_data, d => d.rating_trend))
            .range([vis.height - vis.margin.bottom - max_radius, vis.margin.top + max_radius]);

        // quadrant logic
        const quad_colors = {
            top_right: "#dff5e3",   // light green
            top_left: "#dbe9ff",    // light blue
            bottom_right: "#fff4cc",// light yellow
            bottom_left: "#f8d7da"  // light red
        };

        // add quadrant backgrounds
        vis.quadrants = vis.svg.selectAll(".quadrant")
            .data([
                {key: "top_right"},
                {key: "top_left"},
                {key: "bottom_right"},
                {key: "bottom_left"}
            ])
            .enter()
            .append("rect")
            .attr("class", "quadrant")
            .attr("fill", d => quad_colors[d.key])
            .attr("x", d => {
                if (d.key.includes('right')) {
                    return vis.x_scale(0);
                }
                else {
                    return vis.margin.left;
                }
            })
            .attr("y", d => {
                if (d.key.includes('top')) {
                    return vis.margin.top;
                }
                else {
                    return vis.y_scale(0);
                }
            })
            .attr("width", d => {
                if (d.key.includes('right')) {
                    return vis.width - vis.x_scale(0) - vis.margin.right;
                }
                else {
                    return vis.x_scale(0) - vis.margin.left;
                }
            })
            .attr("height", d => {
                if (d.key.includes('top')) {
                    return vis.y_scale(0) - vis.margin.top;
                }
                else {
                    return vis.height - vis.y_scale(0) - vis.margin.bottom;
                }
            })
            .attr('opacity', 1.0);

        // add axes
        vis.x_axis = d3.axisBottom(vis.x_scale).tickFormat(d => {
            if (d === 0) {
                return ''
            }
            else {
                return d
            }
        });
        vis.y_axis = d3.axisRight(vis.y_scale).tickFormat(d => {
            if (d === 0) {
                return ''
            }
            else {
                return d
            }
        });
        vis.x_axis_group = vis.svg.append("g").attr("class", "axis x-axis")
            .attr("transform", `translate(0, ${vis.y_scale(0)})`)
            .call(vis.x_axis);

       vis.y_axis_group = vis.svg.append("g").attr("class", "axis y-axis")
            .attr("transform", `translate(${vis.x_scale(0)}, 0)`)
            .call(vis.y_axis);

        // add axes labels
        vis.x_axis_label.attr("x", vis.width * 0.7).attr("y", vis.y_scale(0) - 20).raise();
        vis.y_axis_label.attr("x", vis.x_scale(0) + 60).attr("y", vis.height * 0.2)
            .attr("transform", "rotate(-90," + (vis.x_scale(0) + 60) + "," + (vis.height * 0.2) + ")").raise();

        // Create nodes (circles with images inside)
        let nodes = vis.svg.selectAll(".node")
            .data(vis.display_data)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d =>
                `translate(${vis.x_scale(d.sales_trend)}, ${vis.y_scale(d.rating_trend)})`
            );

        let inner = nodes.append("g").attr("class", "node-inner")
        inner.append("circle")
            .attr("r", d => vis.size_scale(d.total_sales))
            .attr("fill", d => {
                if (d.rating_trend < 0 && d.sales_trend < 0) {return 'red'}
                else if (d.rating_trend >= 0 && d.sales_trend < 0) {return '#0388fc'}
                else if (d.rating_trend < 0 && d.sales_trend >= 0) {return '#fcba03'}
                else {return '#00a840'}
            })
            .attr('stroke', '#333')
            .attr('stroke-width', 1);
        inner.append("image")
            .attr("href", d => d.icon)
            .attr("width", d => vis.size_scale(d.total_sales) * 1.5)
            .attr("height", d => vis.size_scale(d.total_sales) * 1.5)
            .attr("x", d => -vis.size_scale(d.total_sales) * 0.75)
            .attr("y", d => -vis.size_scale(d.total_sales) * 0.75)
            .attr("pointer-events", "none");

        nodes.on('mouseover', function(event, data) {
            d3.select(this).select(".node-inner").transition()
                .duration(200)
                .attr("transform", "scale(1.2)");

            // tooltip logic
            if (!vis.is_zoomed) {
                d3.select('#hover-tooltip')
                    .html(`<strong>Franchise Name:</strong> ${data.franchise} <br> 
                       <strong>Rating Trend:</strong> ${roundDecimals(data.rating_trend, 2)} <br> 
                       <strong>Sales Trend:</strong> ${roundDecimals(data.sales_trend, 2)} <br> 
                       Click to zoom in and learn more ...`)
                    .style('opacity', 1);
            } else {
                vis.initFranchiseCard(data, event);
                if (vis.franchise_card) {
                    vis.showFranchiseCard(event);
                }
            }
        }).on('mousemove', function(event) {
            if (!vis.is_zoomed) {
                const tooltip_node = d3.select('#hover-tooltip').node();
                const tooltip_width = tooltip_node.offsetWidth;
                const tooltip_height = tooltip_node.offsetHeight;
                const padding = 10;

                const container = vis.svg.node().parentNode;
                const container_bounds = container.getBoundingClientRect();
                const container_width = container_bounds.width;
                const container_height = container_bounds.height;

                // compute tooltip position relative to container
                let x = event.clientX - container_bounds.left + padding;
                let y = event.clientY - container_bounds.top + padding;

                if (x + tooltip_width > container_width) {
                    x = x - tooltip_width - padding;
                }
                // vertical flip if overflowing
                if (y + tooltip_height > container_height) {
                    y = y - tooltip_height - padding;
                }

                d3.select('#hover-tooltip')
                    .style('left', x + 'px')
                    .style('top', y + 'px');
            }
            else {
                if (vis.franchise_card) {
                    vis.moveFranchiseCard(event);
                }
            }
        }).on('mouseout', function() {
            d3.select(this).select(".node-inner").transition()
                .duration(200)
                .attr("transform", "scale(1)");

            if (!vis.is_zoomed) {
                d3.select('#hover-tooltip')
                    .transition()
                    .duration(200)
                    .style('opacity', 0);
            } else {
                if (vis.franchise_card) {
                    vis.hideFranchiseCard();
                }
            }
        }).on('click', function(event, data) {
            vis.current_quadrant = getQuadrant(data);

            let zoom = getZoomDomain(vis, vis.current_quadrant)

            d3.select(this)
                .interrupt()
                .attr("transform", `
            translate(${vis.x_scale(data.sales_trend)}, ${vis.y_scale(data.rating_trend)})
            scale(1)
        `   );

            if (!vis.is_zoomed) {
                d3.select('#hover-tooltip')
                    .transition()
                    .duration(200)
                    .style('opacity', 0);

                vis.is_zoomed = true;
                // vis.svg.select(this).interrupt();
                vis.zoomElements(zoom);
                vis.updateAxes();
                vis.engulfQuadrants();
            }
        });
    }

    /* ---------------------------- helper zoom function -------------------------- */
    zoomElements(zoom) {
        let vis = this;

        // update the scales to fit the zoom
        vis.x_scale.domain(zoom.x);
        console.log(vis.x_scale.domain())
        vis.y_scale.domain(zoom.y);

        // update circle positions
        vis.svg.selectAll(".node")
            .transition()
            .duration(750)
            .attr("transform", d => {
                const x = vis.x_scale(d.sales_trend)
                const y = vis.y_scale(d.rating_trend)

                let scale;
                if (vis.is_zoomed) {
                    scale = 1.5;
                }
                else {
                    scale = 1;
                }
                return `translate(${x}, ${y}) scale(${scale})`;
            })
            .attr("display", d => {
                const cx = vis.x_scale(d.sales_trend);
                const cy = vis.y_scale(d.rating_trend);


                if ((vis.margin.left <= cx) && (cx <= vis.width - vis.margin.right) && (vis.margin.top <= cy) && (cy <= vis.height - vis.margin.bottom)) {
                    return '';

                } else {
                    return 'none';
                }
            })
    }
    updateAxes() {
        let vis = this;
        let quadrant = vis.current_quadrant;
        let padding = 20;

        const right_tick_values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
        const left_tick_values = [-0.8, -0.6, -0.4, -0.2, 0.0]
        const top_tick_values = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4]
        const bottom_tick_values = [-1.4, -1.2, -1.0, -0.8, -0.6, -0.4, -0.2, -0.0]

        // default case (no quadrant, zoomed out)
        if (!quadrant) {
            vis.x_axis = d3.axisBottom(vis.x_scale).tickFormat(d => {
                if (d === 0) {
                    return ''
                }
                else {
                    return d
                }
            })
            vis.y_axis = d3.axisRight(vis.y_scale).tickFormat(d => {
                if (d === 0) {
                    return ''
                }
                else {
                    return d
                }
            })
            vis.x_axis_group.transition().duration(500)
                .attr("transform", `translate(0, ${vis.y_scale(0)})`)
                .attr("dx", null)
                .attr("dy", null)
                .call(vis.x_axis);

            vis.y_axis_group.transition().duration(500)
                .attr("transform", `translate(${vis.x_scale(0)}, 0)`)
                .attr("dx", null)
                .attr("dy", null)
                .call(vis.y_axis);

            vis.x_axis_group.selectAll(".tick text")
                .attr("text-anchor", "middle")
                .attr("dx", "0em")
                .attr("dy", "0.71em"); // default for bottom axis

            vis.y_axis_group.selectAll(".tick text")
                .attr("text-anchor", "start")
                .attr("dx", "0.32em")
                .attr("dy", "0em");

            vis.x_axis_label.transition().duration(500).attr("x", vis.width * 0.7).attr("y", vis.y_scale(0) - 20);
            vis.y_axis_label.transition().duration(500).attr("x", vis.x_scale(0) + 60).attr("y", vis.height * 0.2)
                .attr("transform", "rotate(-90," + (vis.x_scale(0) + 60) + "," + (vis.height * 0.2) + ")");
            return;
        }

        // move axes based on quadrant
        if (quadrant === 'top_left') {
            vis.x_axis = d3.axisTop(vis.x_scale).tickValues(left_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.x_axis_group.transition().duration(500).attr("transform", `translate(0, ${vis.height - vis.margin.bottom - padding})`)
                .call(vis.x_axis);

            vis.y_axis = d3.axisLeft(vis.y_scale).tickValues(top_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.y_axis_group.transition().duration(500).attr("transform", `translate(${vis.width - vis.margin.right - padding}, 0)`)
                .call(vis.y_axis);

            vis.x_axis_label.transition().duration(500).attr('x', vis.width / 2).attr('y', vis.height - vis.margin.bottom - 3 * padding);
            vis.y_axis_label.transition().duration(500).attr('x', vis.width - vis.margin.right - 3 * padding).attr('y', vis.height / 2)
                .attr("transform", "rotate(-90," + (vis.width - vis.margin.right - 3 * padding) + "," + (vis.height / 2) + ")");
        }
        else if (quadrant === 'top_right') {
            vis.x_axis = d3.axisTop(vis.x_scale).tickValues(right_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.x_axis_group.transition().duration(500).attr("transform", `translate(0, ${vis.height - vis.margin.bottom - padding})`)
                .call(vis.x_axis);

            vis.y_axis = d3.axisRight(vis.y_scale).tickValues(top_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.y_axis_group.transition().duration(500).attr("transform", `translate(${vis.margin.left + padding}, 0)`)
                .call(vis.y_axis);

            vis.x_axis_label.transition().duration(500).attr('x', vis.width / 2).attr('y', vis.height - vis.margin.bottom - 3 * padding);
            vis.y_axis_label.transition().duration(500)
                .attr('x', vis.margin.left + 4 * padding)
                .attr('y', vis.height / 2)
                .attr("transform", "rotate(-90," + (vis.margin.left + 4 * padding) + "," + (vis.height / 2) + ")");
        }
        else if (quadrant === 'bottom_left') {
            vis.x_axis = d3.axisBottom(vis.x_scale).tickValues(left_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.x_axis_group.transition().duration(500).attr("transform", `translate(0, ${vis.margin.top + padding})`)
                .call(vis.x_axis);

            vis.y_axis = d3.axisLeft(vis.y_scale).tickValues(bottom_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.y_axis_group.transition().duration(500).attr("transform", `translate(${vis.width - vis.margin.right - padding}, 0)`)
                .call(vis.y_axis);

            vis.x_axis_label.transition().duration(500).attr('x', vis.width / 2).attr('y', vis.margin.top + 3 * padding);
            vis.y_axis_label.transition().duration(500)
                .attr('x', vis.width - vis.margin.right - 3 * padding)
                .attr('y', vis.height / 2)
                .attr("transform", "rotate(-90," + (vis.width - vis.margin.right - 3 * padding) + "," + (vis.height / 2) + ")");
        }
        else if (quadrant === 'bottom_right') {
            vis.x_axis = d3.axisBottom(vis.x_scale).tickValues(right_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.x_axis_group.transition().duration(500).attr("transform", `translate(0, ${vis.margin.top + padding})`)
                .call(vis.x_axis);

            vis.y_axis = d3.axisRight(vis.y_scale).tickValues(bottom_tick_values).tickFormat(d => {
                if (d === 0) {
                    return ''
                } else {
                    return d
                }
            })
            vis.y_axis_group.transition().duration(500).attr("transform", `translate(${vis.margin.left + padding}, 0)`)
                .call(vis.y_axis);

            vis.x_axis_label.transition().duration(500).attr('x', vis.width / 2).attr('y', vis.margin.top + 3 * padding);
            vis.y_axis_label.transition().duration(500)
                .attr('x', vis.margin.left + 4 * padding)
                .attr('y', vis.height / 2)
                .attr("transform", "rotate(-90," + (vis.margin.left + 4 * padding) + "," + (vis.height / 2) + ")");
        }

        if (quadrant === 'top_left') {
            vis.x_axis_group.selectAll(".tick text")
                .attr("dy", "-0.3em");
            vis.y_axis_group.selectAll(".tick text")
                .attr("dx", "-1.3em");
        }
        else if (quadrant === 'top_right') {
            vis.x_axis_group.selectAll(".tick text")
                .attr("dy", "-0.3em");
        }
        else if (quadrant === 'bottom_left') {
            vis.y_axis_group.selectAll(".tick text")
                .attr("dx", "-1.5em");
        }
    }
    engulfQuadrants() {
        let vis = this;

        if (!vis.current_quadrant) {
            vis.quadrants.transition().duration(500)
                .attr("x", d => {
                    if (d.key.includes('right')) {
                        return vis.x_scale(0);
                    }
                    else {
                        return vis.margin.left;
                    }
                })
                .attr("y", d => {
                    if (d.key.includes('top')) {
                        return vis.margin.top;
                    }
                    else {
                        return vis.y_scale(0);
                    }
                })
                .attr("width", d => {
                    if (d.key.includes('right')) {
                        return vis.width - vis.x_scale(0) - vis.margin.right;
                    }
                    else {
                        return vis.x_scale(0) - vis.margin.left;
                    }
                })
                .attr("height", d => {
                    if (d.key.includes('top')) {
                        return vis.y_scale(0) - vis.margin.top;
                    }
                    else {
                        return vis.height - vis.y_scale(0) - vis.margin.bottom;
                    }
                })
                .style('opacity', 1);

            return;
        }

        vis.quadrants
            .transition()
            .duration(750)
            .attr("x", d => {
                if (d.key === vis.current_quadrant) {
                    return vis.margin.left;
                } else {
                    return vis.x_scale(0);
                }
            })
            .attr("y", d => {
                if (d.key === vis.current_quadrant) {
                    return vis.margin.top;
                } else {
                    return vis.y_scale(0);
                }
            })
            .attr("width", d => {
                if (d.key === vis.current_quadrant) {
                    return vis.width - vis.margin.left - vis.margin.right;
                }
                else {
                    return 0;
                }
            })
            .attr("height", d => {
               if (d.key === vis.current_quadrant) {
                   return vis.height - vis.margin.top - vis.margin.bottom;
               }
               else {
                   return 0;
               }
            })
            .style("opacity", d => {
                if (d.key === vis.current_quadrant) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
    }

    /* --- MAJOR FUNCTION - CREATE "FRANCHISE" PANELS FOR EACH FRANCHISE --- */

    initFranchiseCard(data){
        // select the pop-up element
        let vis = this;

        // toggle display settings
        if (vis.active_franchise === data.franchise){
            let display = 'none'
            if (vis.display_trendlines) {
                display = null
            }
            vis.rating_trendlines.attr("display", display);
            vis.sales_trendlines.attr("display", display);
            return;
        }
        else {
            vis.active_franchise = data.franchise;
        }

        // create the franchise card
        vis.franchise_card = d3.select('#franchise-card')

        // clear previous html
        vis.franchise_card.html("");

        // create the svg for the franchise card
        let width = 700;
        let height = 150;

        // store franchise history
        const history = data.franchise_history;

        // Create inner visualization svg
        const card_svg = vis.franchise_card.append("svg").attr("width", width).attr("height", height);
        const margin = { top: 20, right: 40, bottom: 30, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        vis.chart = card_svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // x and y scales
       vis.x_scale_card = d3.scaleLinear()
            .domain(d3.extent(history, d => d.age))
            .range([0, innerWidth]);

        vis.y_rating_scale_card = d3.scaleLinear()
            .domain(d3.extent(history, d => d.average_rating))
            .range([innerHeight, 0]);
        vis.y_sales_scale_card = d3.scaleLinear()
            .domain(d3.extent(history, d => d.total_franchise_sales))
            .range([innerHeight, 0]);

        // axis
        const num_ticks = 4;
        const x_axis = d3.axisBottom(vis.x_scale_card).ticks(num_ticks);
        const y_rating_axis = d3.axisLeft(vis.y_rating_scale_card).ticks(num_ticks);
        const y_sales_axis = d3.axisRight(vis.y_sales_scale_card).ticks(num_ticks);

        // append all axes to chart
        vis.chart.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(x_axis);
        vis.chart.append("g")
            .call(y_rating_axis);
        vis.chart.append("g")
            .attr("transform", `translate(${innerWidth}, 0)`)
            .call(y_sales_axis);

        // helper function
        vis.generate_trendlines(history);

        // Rating dots
        vis.chart.selectAll(".rating-dot")
            .data(history)
            .enter()
            .append("circle")
            .attr("class", "rating-dot")
            .attr("cx", d => vis.x_scale_card(d.age))
            .attr("cy", d => vis.y_rating_scale_card(d.average_rating))
            .attr("r", 3)
            .attr("fill", "steelblue");
        // Sales dots
        vis.chart.selectAll(".sales-dot")
            .data(history)
            .enter()
            .append("circle")
            .attr("class", "sales-dot")
            .attr("cx", d => vis.x_scale_card(d.age))
            .attr("cy", d => vis.y_sales_scale_card(d.total_franchise_sales))
            .attr("r", 3)
            .attr("fill", "orange");

        // Axis titles
        vis.chart.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + margin.bottom - 2)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Years Since Franchise Inception");
        vis.chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -margin.left + 12)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Rating (/100)");
        vis.chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", innerWidth + margin.right)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text("Sales");


        // add the title
        vis.franchise_card.append("div")
            .style("font-weight", "bold")
            .style("margin-bottom", "8px")
            .text(data.franchise)

// Create a group for the legend, positioned below the chart
        const legend = vis.franchise_card.append("div")
            .style("margin-bottom", "8px")
            .style("margin-right", "8px")
            .style("display", "flex")
            .style("gap", "20px")
            .style("font-size", "10px");

        // Rating legend (blue)
        legend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .html(`<div style="width: 8px; height: 8px; background-color: steelblue; margin-right: 4px;"></div>Ratings`);

        // Sales legend (orange)
        legend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .html(`<div style="width: 8px; height: 8px; background-color: orange; margin-right: 4px;"></div>Sales`);

        // position the popup
        // vis.franchise_card
        //     .style("left", (event.clientX + 10) + "px")
        //     .style("top", (event.clientY - 10) + "px")
        //     .transition()
        //     .duration(500)
        //     .style("opacity", 1)
        //     .style("pointer-events", "auto");

    }

    moveFranchiseCard(event) {
        let vis = this;

        // card dimensions
        const card = vis.franchise_card.node();
        const card_width = card.offsetWidth;
        const card_height = card.offsetHeight;
        const card_padding = 12;

        const container_bounds = vis.svg.node().parentNode.getBoundingClientRect();
        const container_width = container_bounds.width;
        const container_height = container_bounds.height;

        // card positioning
        let card_x = event.clientX - container_bounds.left + card_padding;
        let card_y = event.clientY - container_bounds.top + card_padding;


        // horizontal flip if overflowing at the right
        if (card_x + card_width > container_width) {
            card_x = card_x - card_width - card_padding;
        }
        // vertical flip if overflowing at the bottom
        if (card_y + card_height > container_height) {
            card_y = card_y - card_height - card_padding;
        }
        vis.franchise_card
            .style("left", card_x + "px")
            .style("top", card_y + "px")
    }
    showFranchiseCard(event) {
        let vis = this;
        vis.moveFranchiseCard(event);
        vis.franchise_card.transition().duration(500)
            .style('opacity', 1.0)
            .style('pointer-events', 'auto');
    }
    hideFranchiseCard() {
        let vis = this;
        vis.franchise_card
            .transition()
            .duration(500)
            .style('opacity', 0)
            .style('pointer-events', 'none');
    }
    generate_trendlines(history) {
        const vis = this;

        // extract x and y values to compute slope
        const x_vals = history.map(d => d.age);
        const y_rating_vals = history.map(d => d.average_rating);
        const y_sales_vals = history.map(d => d.total_franchise_sales);

        // slope and y_intercepts for sales and ratings trendlines
        const rating_m = slope(x_vals, y_rating_vals);
        const sales_m = slope(x_vals, y_sales_vals);
        const rating_b = d3.mean(y_rating_vals) - rating_m * d3.mean(x_vals);
        const sales_b = d3.mean(y_sales_vals) - sales_m * d3.mean(x_vals);

        // Create trendline paths
        vis.rating_trendlines = vis.chart.append("line")
            .attr("x1", vis.x_scale_card(d3.min(x_vals)))
            .attr("y1", vis.y_rating_scale_card(rating_m * d3.min(x_vals) + rating_b))
            .attr("x2", vis.x_scale_card(d3.max(x_vals)))
            .attr("y2", vis.y_rating_scale_card(rating_m * d3.max(x_vals) + rating_b))
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2")

        vis.sales_trendlines = vis.chart.append("line")
            .attr("x1", vis.x_scale_card(d3.min(x_vals)))
            .attr("y1", vis.y_sales_scale_card(sales_m * d3.min(x_vals) + sales_b))
            .attr("x2", vis.x_scale_card(d3.max(x_vals)))
            .attr("y2", vis.y_sales_scale_card(sales_m * d3.max(x_vals) + sales_b))
            .attr("stroke", "orange")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 2")

        let display = 'none'
        if (vis.display_trendlines) {
            display = null
        }
        vis.rating_trendlines.attr("display", display);
        vis.sales_trendlines.attr("display", display);
    }
}

/* --------------------------- HELPER FUNCTIONS* --------------------------- */
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
function roundDecimals(num, dp) {
    const powOf10 = Math.pow(10, dp)
    return Math.round(num * powOf10) / powOf10;
}
// Obtain the current quadrant
function getQuadrant(d) {
    if (d.rating_trend < 0 && d.sales_trend < 0) return "bottom_left";   // red
    if (d.rating_trend >= 0 && d.sales_trend < 0) return "top_left";     // blue
    if (d.rating_trend < 0 && d.sales_trend >= 0) return "bottom_right"; // yellow
    return "top_right"; // green
}
// Get the zoomed in domain
function getZoomDomain(vis, quadrant) {
    const x_extent = d3.extent(vis.display_data, d => d.sales_trend);
    const y_extent = d3.extent(vis.display_data, d => d.rating_trend);

    const x_mid = 0;
    const y_mid = 0;

    if (quadrant === "top_right") {
        return { x: [x_mid, x_extent[1]], y: [y_mid, y_extent[1]] };
    }
    if (quadrant === "top_left") {
        return { x: [x_extent[0], x_mid], y: [y_mid, y_extent[1]] };
    }
    if (quadrant === "bottom_right") {
        return { x: [x_mid, x_extent[1]], y: [y_extent[0], y_mid] };
    }
    if (quadrant === "bottom_left") {
        return { x: [x_extent[0], x_mid], y: [y_extent[0], y_mid] };
    }
    // default case
    else {
        console.log({x: [x_extent[0], x_extent[1]], y: [y_extent[0], y_extent[1]]});
        return {x: [x_extent[0], x_extent[1]], y: [y_extent[0], y_extent[1]]};
    }
}
