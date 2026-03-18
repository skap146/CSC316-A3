// load video game franchise data
let video_game_franchise_data = []
d3.csv('data/franchise_data.csv').then(csv => {

    csv.forEach(row => {
        row.average_rating = +row.average_rating
        row.total_franchise_sales = +row.total_franchise_sales
        row.year = +row.year
        row.age = +row.age
    })

    video_game_franchise_data = csv
    console.log(video_game_franchise_data)
    let vis = new Vis('vis-area', video_game_franchise_data)
    console.log(vis)
})

