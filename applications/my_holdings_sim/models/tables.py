# Define your tables below (or better in another model file) for example
#
# >>> db.define_table('mytable', Field('myfield', 'string'))
#
# Fields can be 'string','text','password','integer','double','boolean'
#       'date','time','datetime','blob','upload', 'reference TABLENAME'
# There is an implicit 'id integer autoincrement' field
# Consult manual for more options, validators, etc.




# after defining tables, uncomment below to enable auditing
# auth.enable_record_versioning(db)


import datetime
from datetime import timedelta

def get_user_email():
    return None if auth.user is None else auth.user.email

def get_current_time():
    return datetime.datetime.utcnow()

db.define_table('stocks',
  Field('symbol', notnull=True, unique=True),
  Field('last_updated', 'datetime', default=get_current_time()),
  Field('name'),
  Field('price'),
  Field('mktcap'),
  Field('logo'),
)
db.define_table('watched_stocks',
  Field('user_email'),
  Field('symbol'),
)
db.define_table('purchases',
  Field('user_email', notnull=True),
  Field('symbol', notnull=True),
  Field('quantity', notnull=True),
  Field('purchase_price', notnull=True),
  Field('purchase_date', 'datetime', default=get_current_time()),
)
