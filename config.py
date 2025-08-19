
URL = "https://bank.jundev.eu"

PORT = 4464

DATABASE = "mysql+pymysql://payuser:yourpassword@jundev.eu/paydb"

SESSION_TIMEOUT = 2 # in hours

STEP1_TIMEOUT = 0.2 # in hours

BANK_CODE = "1234" #! used for IBAN generation NEVER CHANGE THIS IN PRODUCTION BUT CHANGE BEFORE DEPLOYMENT

CC_CODE = "KB" #! can be fictional NEVER CHANGE THIS IN PRODUCTION

BANK_CARD_EXPIRE_DAYS = 17*30

BIG_TRANSACTION_LIMIT = 10* 1000