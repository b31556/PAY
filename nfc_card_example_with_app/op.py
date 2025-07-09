import tkinter as tk
from tkinter import messagebox
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# Database setup
engine = create_engine('sqlite:///C:/Users/Dell/KÖZÖD/user2.db', echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine)
session = Session()

# SQLAlchemy model
class User(Base):
    __tablename__ = 'cards'

    id = Column(Integer, primary_key=True)
    login = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    card = Column(String, nullable=False)
    pincode = Column(String, nullable=False)
    amaunt = Column(Integer, nullable=False, default=10)

Base.metadata.create_all(engine)

# Teller code (hardcoded because why not)
TELLER_CODE = "2213"

# GUI
class TellerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CSÁT Bank Teller Interface")

        self.teller_code_frame()

    def clear_frame(self):
        for widget in self.root.winfo_children():
            widget.destroy()

    def teller_code_frame(self):
        self.clear_frame()
        tk.Label(self.root, text="Enter Teller Code:").pack()
        self.teller_code_entry = tk.Entry(self.root, show="*")
        self.teller_code_entry.pack()
        tk.Button(self.root, text="Login as Teller", command=self.verify_teller).pack()

    def verify_teller(self):
        if self.teller_code_entry.get() == TELLER_CODE:
            self.user_lookup_frame()
        else:
            messagebox.showerror("Error", "Wrong teller code, go back to the training wheels.")

    def user_lookup_frame(self):
        self.clear_frame()
        tk.Label(self.root, text="User Login:").pack()
        self.login_entry = tk.Entry(self.root)
        self.login_entry.pack()

        tk.Label(self.root, text="User Password:").pack()
        self.password_entry = tk.Entry(self.root, show="*")
        self.password_entry.pack()

        tk.Button(self.root, text="Authenticate User", command=self.authenticate_user).pack()
        self.user = None

    def authenticate_user(self):
        login = self.login_entry.get()
        password = self.password_entry.get()
        user = session.query(User).filter_by(login=login, password=password).first()
        if user:
            self.user = user
            self.user_info_frame()
        else:
            messagebox.showerror("Auth Failed", "Invalid user login or password. Try not to break the system.")

    def user_info_frame(self):
        self.clear_frame()
        tk.Label(self.root, text=f"User: {self.user.login}").pack()
        tk.Label(self.root, text=f"Balance: {self.user.amaunt}").pack()

        # Card ID
        tk.Label(self.root, text=f"Card ID:").pack()
        self.card_entry = tk.Entry(self.root)
        self.card_entry.insert(0, self.user.card)
        self.card_entry.pack()

        # Pincode
        tk.Label(self.root, text="New PIN Code:").pack()
        self.pin_entry = tk.Entry(self.root, show="*")
        self.pin_entry.insert(0, "")
        self.pin_entry.pack()

        tk.Button(self.root, text="Update Card Info", command=self.update_user_info).pack()
        tk.Button(self.root, text="Back to User Lookup", command=self.user_lookup_frame).pack()

    def update_user_info(self):
        new_card = self.card_entry.get()
        new_pin = self.pin_entry.get()

        if not new_pin.isdigit() or len(new_pin) != 4:
            messagebox.showwarning("Invalid PIN", "PIN code must be a 4-digit number. Duh.")
            return

        self.user.card = new_card
        self.user.pincode = new_pin
        session.commit()
        messagebox.showinfo("Success", "User info updated. Hope you didn’t mess it up.")

# Run GUI
if __name__ == "__main__":
    root = tk.Tk()
    app = TellerApp(root)
    root.mainloop()
