from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app import db, Orders, Products

orders_bp = Blueprint("orders", __name__, url_prefix="/orders")

@orders_bp.route("/", methods=["GET", "POST"])
@login_required
def orders_home():
    if request.method == "POST":
        product_id = request.form.get("product_id", type=int)
        qty = request.form.get("quantity", type=int)
        if not product_id or not qty or qty <= 0:
            flash("Invalid order details", "danger")
            return redirect(url_for("orders.orders_home"))
        product = Products.query.get_or_404(product_id)
        if product.Stock < qty:
            flash("Not enough stock", "warning")
            return redirect(url_for("orders.orders_home"))
        order = Orders(UserID=current_user.UserID, ProductID=product.ProductID, Quantity=qty)
        product.Stock -= qty
        db.session.add(order)
        db.session.commit()
        flash("Order placed successfully", "success")
        return redirect(url_for("orders.orders_home"))
    # Show order history for current user; Admin can see all
    if current_user.Role == "Admin":
        orders = Orders.query.order_by(Orders.OrderID.desc()).all()
    else:
        orders = Orders.query.filter_by(UserID=current_user.UserID).order_by(Orders.OrderID.desc()).all()
    return render_template("orders/orders.html", orders=orders)