
FRONTEND_URL = "http://localhost:8080"

URL = "http://localhost:4464"

PORT = 4464

DATABASE = "mysql+pymysql://payuser:yourpassword@jundev.eu/paydb"

CONTACTS_ADD_PAGE = "/contacts/add"

SESSION_TIMEOUT = 2 # in hours

STEP1_TIMEOUT = 0.2 # in hours

NEW_CONTACT_WAIT_TIME = 12 # in hours

BANK_CODE = "1234" #! used for IBAN generation NEVER CHANGE THIS IN PRODUCTION BUT CHANGE BEFORE DEPLOYMENT

CC_CODE = "KB" #! can be fictional NEVER CHANGE THIS IN PRODUCTION

BANK_CARD_EXPIRE_DAYS = 17*30

BIG_TRANSACTION_LIMIT = 10* 1000

