from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app import db, Products

products_bp = Blueprint("products", __name__, url_prefix="/products")

@products_bp.route("/")
def list_products():
    q = request.args.get("q", "").strip()
    min_price = request.args.get("min", type=float)
    max_price = request.args.get("max", type=float)
    query = Products.query
    if q:
        query = query.filter(Products.Name.ilike(f"%{q}%"))
    if min_price is not None:
        query = query.filter(Products.Price >= min_price)
    if max_price is not None:
        query = query.filter(Products.Price <= max_price)
    products = query.order_by(Products.ProductID.desc()).all()
    return render_template("products/products.html", products=products)

@products_bp.route("/new", methods=["GET", "POST"])
@login_required
def new_product():
    if current_user.Role not in ("Seller", "Admin"):
        flash("Only sellers/admin can add products", "danger")
        return redirect(url_for("products.list_products"))
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        price = request.form.get("price", type=float)
        stock = request.form.get("stock", type=int)
        if not name or price is None or stock is None:
            flash("All fields are required", "danger")
            return redirect(url_for("products.new_product"))
        prod = Products(Name=name, Price=price, Stock=stock, SellerID=current_user.UserID)
        db.session.add(prod)
        db.session.commit()
        flash("Product added", "success")
        return redirect(url_for("products.list_products"))
    return render_template("products/edit_product.html", product=None)

@products_bp.route("/<int:pid>/edit", methods=["GET", "POST"])
@login_required
def edit_product(pid):
    prod = Products.query.get_or_404(pid)
    if current_user.Role not in ("Seller", "Admin") or (current_user.Role == "Seller" and prod.SellerID != current_user.UserID):
        flash("Not authorized", "danger")
        return redirect(url_for("products.list_products"))
    if request.method == "POST":
        prod.Name = request.form.get("name", prod.Name)
        prod.Price = request.form.get("price", type=float, default=prod.Price)
        prod.Stock = request.form.get("stock", type=int, default=prod.Stock)
        db.session.commit()
        flash("Product updated", "success")
        return redirect(url_for("products.list_products"))
    return render_template("products/edit_product.html", product=prod)