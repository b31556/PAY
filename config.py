
URL = "http://100.104.43.55:8081"

PORT = URL.split(":")[-1] if ":" in URL else 4464

DATABASE = "sqlite:///db_v2.db"

SESSION_TIMEOUT = 2 # in hours

STEP1_TIMEOUT = 0.2 # in hours