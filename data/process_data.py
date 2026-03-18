import pandas as pd

pd.set_option('display.max_columns', None)

# read games csv
games_df = pd.read_csv('games.csv')
sales_df = pd.read_csv('vgsales.csv')

# columns
cols = set(games_df.columns)
titles = set(games_df['title'])

# insert a franchise column to the pd series
games_df['Franchise'] = 'N/A'
sales_df['Franchise'] = 'N/A'

# keywords for each franchise
franchise_keywords = {'Mario': 'Mario',
                      'The Legend of Zelda': 'Legend of Zelda | Zelda',
                      'Pokemon': 'Pokemon',
                      'Grand Theft Auto': 'Grand Theft Auto',
                      'Call of Duty': 'Call of Duty',
                      'Halo': 'Halo',
                      'God of War': 'God of War',
                      'FIFA': 'FIFA',
                      "Assassin's Creed": "Assassin's Creed",
                      "Street Fighter": "Street Fighter",
                      "Resident Evil": "Resident Evil",
                      "Kirby": "Kirby",
                      "Forza": "Forza",
                      "The Elder Scrolls": "The Elder Scrolls",
                      "Diablo": "Diablo",
                      "Final Fantasy": "Final Fantasy",
                      "Monster Hunter": "Monster Hunter",
                      "Tomb Raider": "Tomb Raider",
                      "Sonic": "Sonic the Hedgehog | Sonic",
                      "Gears": "Gears"}

def generate_aggregate_ratings(franchise_keywords, df):
    # assign the video games a franchise
    for franchise in franchise_keywords:
        # filter
        df.loc[df['title'].str.contains
        (franchise_keywords[franchise]), 'Franchise'] = franchise

    games_in_franchises = df[df['Franchise'] != 'N/A']

    games_in_franchises['year'] = pd.to_datetime(games_in_franchises['release_date'], errors='coerce').dt.year
    # drop rows where year or metascore is missing
    games_clean = games_in_franchises.dropna(subset=['year', 'metascore'])
    # group by year and franchise, compute average metascore
    avg_rating_df = games_clean.groupby(['year', 'Franchise']).agg(
        average_rating=('metascore', 'mean')
    ).reset_index()

    return avg_rating_df

def generate_aggregate_sales(franchise_keywords, df):
    # assign the video games a franchise
    for franchise in franchise_keywords:
        # filter
        df.loc[df['Name'].str.contains
        (franchise_keywords[franchise]), 'Franchise'] = franchise

    games_in_franchises = df[df['Franchise'] != 'N/A']

    # get the years
    games_in_franchises['year'] = pd.to_numeric(games_in_franchises['Year'], errors='coerce')
    # drop rows where year or global sales data is missing
    games_clean = games_in_franchises.dropna(subset=['year', 'Global_Sales'])

    # group by year and franchise, compute total global sales
    avg_sales_df = games_clean.groupby(['year', 'Franchise']).agg(
        total_franchise_sales=('Global_Sales', 'sum')
    ).reset_index()

    return avg_sales_df

