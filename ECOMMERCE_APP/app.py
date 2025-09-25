from flask import Flask, render_template, redirect, url_for, request, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from routes.users import users_bp
from routes.products import products_bp
from routes.orders import orders_bp
import os

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///ecommerce.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "users.login"

# -------------------- Models --------------------
class Users(db.Model, UserMixin):
    __tablename__ = "Users"
    UserID = db.Column(db.Integer, primary_key=True)
    Username = db.Column(db.String(80), unique=True, nullable=False)
    Password = db.Column(db.String(255), nullable=False)
    Email = db.Column(db.String(120), unique=True, nullable=False)
    Role = db.Column(db.String(20), nullable=False)  # Customer | Seller | Admin

    def get_id(self):
        return str(self.UserID)

class Products(db.Model):
    __tablename__ = "Products"
    ProductID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(120), nullable=False)
    Price = db.Column(db.Float, nullable=False)
    Stock = db.Column(db.Integer, nullable=False, default=0)
    SellerID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=True)
    seller = db.relationship("Users", backref="products", foreign_keys=[SellerID])

class Orders(db.Model):
    __tablename__ = "Orders"
    OrderID = db.Column(db.Integer, primary_key=True)
    UserID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)
    ProductID = db.Column(db.Integer, db.ForeignKey("Products.ProductID"), nullable=False)
    Quantity = db.Column(db.Integer, nullable=False)
    OrderDate = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("Users", backref="orders", foreign_keys=[UserID])
    product = db.relationship("Products", backref="orders", foreign_keys=[ProductID])

# --------------- Login manager loader ---------------
@login_manager.user_loader
def load_user(user_id):
    return Users.query.get(int(user_id))

# --------------- DB init ---------------
with app.app_context():
    db.create_all()

# --------------- Blueprints ---------------
app.register_blueprint(users_bp)
app.register_blueprint(products_bp)
app.register_blueprint(orders_bp)

# --------------- Root route ---------------
@app.route("/")
def index():
    # Show products landing
    prods = Products.query.order_by(Products.ProductID.desc()).all()
    return render_template("products/products.html", products=prods)

# --------------- CLI helper ---------------
@app.cli.command("seed")
def seed():
    """Seed some demo data."""
    if not Users.query.filter_by(Email="admin@example.com").first():
        admin = Users(Username="admin", Email="admin@example.com", Password=generate_password_hash("admin123"), Role="Admin")
        seller = Users(Username="seller", Email="seller@example.com", Password=generate_password_hash("seller123"), Role="Seller")
        cust = Users(Username="customer", Email="customer@example.com", Password=generate_password_hash("customer123"), Role="Customer")
        db.session.add_all([admin, seller, cust])
        db.session.commit()
    if not Products.query.first():
        seller = Users.query.filter_by(Role="Seller").first()
        db.session.add_all([
            Products(Name="Sample Phone", Price=599.99, Stock=10, SellerID=seller.UserID if seller else None),
            Products(Name="Wireless Headphones", Price=99.99, Stock=25, SellerID=seller.UserID if seller else None),
            Products(Name="USB-C Cable", Price=9.99, Stock=100, SellerID=seller.UserID if seller else None),
        ])
        db.session.commit()
    print("Seeded users and products.")

if __name__ == "__main__":
    app.run(debug=True)