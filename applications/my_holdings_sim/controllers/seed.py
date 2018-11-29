import requests

@auth.requires_login()
def seed_db():
    #db.stocks.insert(symbol = 'WAT')
    r = requests.get("https://api.iextrading.com/1.0/ref-data/symbols")
    data = r.json()
    for stock in data:
        print(stock.keys())
        s = stock["symbol"]
        n = stock["name"]
        values = 'VALUES ("' + s + '", "' + n + '");'
        print(values)
        db.executesql("INSERT INTO Stocks (symbol, name) " + values)
