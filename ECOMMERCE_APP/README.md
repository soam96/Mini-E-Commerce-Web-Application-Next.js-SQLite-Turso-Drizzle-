# Mini E‑Commerce (Flask)

A beginner‑friendly Flask e‑commerce app with Users, Products, and Orders.

## Features
- Register/Login with password hashing (Werkzeug) and Flask‑Login sessions
- Roles: Customer, Seller, Admin
  - Customer: browse products, place orders, view order history
  - Seller: add/update products
  - Admin: view/manage all orders
- SQLite database using Flask‑SQLAlchemy
- Simple HTML templates (PicoCSS)
- Search/filter products by name and price range

## Directory
```
ECOMMERCE_APP/
├── app.py
├── requirements.txt
├── routes/
│   ├── users.py
│   ├── products.py
│   └── orders.py
├── templates/
│   ├── base.html
│   ├── users/
│   │   ├── login.html
│   │   ├── register.html
│   │   └── dashboard.html
│   ├── products/
│   │   ├── products.html
│   │   └── edit_product.html
│   └── orders/
│       └── orders.html
└── static/
```

## Setup
1) Create venv and install deps
```
cd ECOMMERCE_APP
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

2) Run (auto-creates SQLite db at ecommerce.db)
```
export FLASK_APP=app.py  # Windows PowerShell: $env:FLASK_APP="app.py"
flask run
```

3) Seed demo data (optional)
```
flask seed
```

Open http://127.0.0.1:5000

## Database Schema (SQLite)
- Users(UserID PK, Username, Password(hashed), Email, Role)
- Products(ProductID PK, Name, Price, Stock, SellerID FK->Users)
- Orders(OrderID PK, UserID FK->Users, ProductID FK->Products, Quantity, OrderDate)

## Notes
- Admin can view all orders at /orders/
- Sellers can add/edit products at /products/new and /products/<id>/edit
- Customers place orders from the products page; they can see their order history at /orders/

## Future Improvements
- Admin dashboards for managing users/products
- Pagination, images, and better UI
- CSRF protection and form validation (WTForms)
- REST API endpoints for SPA/mobile