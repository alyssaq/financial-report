import pandas as pd
import datetime
import numpy as np
import calendar

water_bills = pd.DataFrame([
{
  "date": '2013-01',
  "amount": 36.05
},
{
  "date": '2013-06',
  "amount": 255.42
},
{
  "date": '2014-01',
  "amount": 225.09
},
{
  "date": '2014-05',
  "amount": 154.05
}])

def addBills(table):
  def add(row):
    i = table[row.date].index[0]
    table.loc[table.index == i, 'bills'] = row.amount
  return add

data = pd.read_csv(
  '/Users/bun/Dropbox/bateau bay/statements/20140811.csv',
  dayfirst=True,
  header=None,
  names=['date', 'paid', 'description'],
  index_col=0,
  parse_dates=True,
  usecols=[0, 1, 2])
if data.paid.dtype != np.float64:
    data.paid = data.paid.str.replace(' ', '').astype(float)
data.description = data.description.astype(str)
data = data[(data.paid > 1) &
            ~(data.description.str.contains('alyssa|apple', case=False))]
first_row = pd.DataFrame({'paid': 0.0, 'description': 'Start Dec2012'},
                         index=pd.to_datetime(['20121201']))
last_row = pd.DataFrame({'paid': 0.0, 'description': 'today'},
                        index=pd.to_datetime([datetime.datetime.now()]))
data = pd.concat([first_row, data, last_row])

entries = data.resample('7D', how='sum',
                        kind='timestamp', label='right').fillna(0)
date_format = lambda x: x.strftime('%d-%b')
entries['end'] = entries.index.map(date_format)
entries['start'] = (entries.index - datetime.timedelta(days=6)).map(date_format)
entries.loc[:, 'bills'] = 0
entries.loc[:, 'rent'] = 420
entries.loc[:, 'option'] = 330
entries.loc[:, 'rates'] = 50
water_bills.apply(addBills(entries), axis=1)

df = entries.groupby([entries.index.month, entries.index.year]).sum()
df.index.names = ['month', 'year']
df.loc[:, 'penalties'] = 100
owing_func = lambda row: (row.rent + row.option +
                          row.rates + row.bills + row.penalties)
df.loc[:, 'owing'] = df.apply(owing_func, axis=1)
df = df.reset_index()
df.month = df.month.map(lambda x: calendar.month_abbr[x])
json_result = df.to_json(orient='records')  # does not support int/floats
print(json_result)
