from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from app import db, Users

users_bp = Blueprint("users", __name__, url_prefix="/users")

@users_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        role = request.form.get("role", "Customer")
        if not username or not email or not password:
            flash("All fields are required", "danger")
            return redirect(url_for("users.register"))
        if Users.query.filter((Users.Email==email) | (Users.Username==username)).first():
            flash("User already exists", "danger")
            return redirect(url_for("users.register"))
        user = Users(Username=username, Email=email, Password=generate_password_hash(password), Role=role)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash("Account created!", "success")
        return redirect(url_for("users.dashboard"))
    prefill_email = request.args.get("email", "")
    return render_template("users/register.html", prefill_email=prefill_email)

@users_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = Users.query.filter_by(Email=email).first()
        if not user:
            flash("No account found. Please register.", "warning")
            return redirect(url_for("users.register", email=email))
        if not check_password_hash(user.Password, password):
            flash("Invalid credentials", "danger")
            return redirect(url_for("users.login"))
        login_user(user, remember=True)
        flash("Welcome back!", "success")
        return redirect(url_for("users.dashboard"))
    return render_template("users/login.html")

@users_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out", "info")
    return redirect(url_for("users.login"))

@users_bp.route("/dashboard")
@login_required
def dashboard():
    return render_template("users/dashboard.html", user=current_user)