import pandas as pd

df = pd.read_csv('franchise_data.csv')

print(list(df.columns))
df.drop(['Unnamed: 0.1', 'Unnamed: 0'], axis=1, inplace=True)
print(df)
df.to_csv('franchise_data.csv')