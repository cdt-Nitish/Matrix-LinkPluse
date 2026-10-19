const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const store = require("../data/store");
const { mongoose } = require("../config/db");

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * GET /login
 * Render Sign In page
 */
exports.getLogin = exports.renderLogin = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  }

  let successMessage = null;
  if (req.query.registered === "1") {
    successMessage = "Account created successfully! Please sign in with your credentials.";
  } else if (req.query.logged_out === "1") {
    successMessage = "You have been logged out successfully.";
  }

  let demoEmail = "";
  let demoPassword = "";
  if (req.query.demo === "admin") {
    demoEmail = "admin@linkpulse.io";
    demoPassword = "password123";
  } else if (req.query.demo === "user") {
    demoEmail = "demo@linkpulse.io";
    demoPassword = "password123";
  }

  const renderData = {
    title: "Sign In",
    pageTitle: "Sign In",
    currentPage: "login",
    page: "login",
    isLoggedIn: Boolean(req.session && req.session.userId),
    oldInput: { email: demoEmail, loginId: demoEmail, password: demoPassword },
    loginId: demoEmail,
    demoPassword: demoPassword,
    errors: [],
    error: null,
    success: successMessage,
    redirectUrl: req.query.redirect || "/",
    user: req.session ? req.session.user : null,
  };

  try {
    return res.render("login", renderData);
  } catch (err) {
    return res.render("auth/login", renderData);
  }
};

/**
 * POST /login
 * Authenticate user with specific feedback on what is wrong:
 * - Informs explicitly if email address is not found
 * - Informs explicitly if password entered is incorrect
 */
exports.postLogin = exports.loginUser = async (req, res, next) => {
  try {
    const emailInput = req.body.email || req.body.loginId || "";
    const { password, remember, redirectUrl } = req.body;
    const safeRedirect = (redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//"))
      ? redirectUrl
      : "/";

    const trimmedEmail = emailInput.trim().toLowerCase();

    // Helper to render login error
    const renderLoginError = (errorMessage, statusCode = 422) => {
      const errorData = {
        title: "Sign In",
        pageTitle: "Sign In",
        currentPage: "login",
        page: "login",
        isLoggedIn: false,
        errors: [errorMessage],
        error: errorMessage,
        success: null,
        oldInput: { email: emailInput, loginId: emailInput, password: "" },
        loginId: emailInput,
        redirectUrl: safeRedirect,
        user: req.session ? req.session.user : null,
      };
      return res.status(statusCode).render("login", errorData);
    };

    if (!trimmedEmail) {
      return renderLoginError("Please enter your email address or username.");
    }

    if (!password) {
      return renderLoginError("Please enter your password.");
    }

    let user = null;
    let isStoreUser = false;

    // 1. Search in MongoDB User Collection
    if (isDbConnected()) {
      user = await User.findOne({
        $or: [
          { email: trimmedEmail },
          { username: trimmedEmail },
        ],
      });
    }

    // Fallback search in store if not found or DB disconnected
    if (!user) {
      const storeUser = store.findUserByLogin(trimmedEmail) || store.findUserByEmail(trimmedEmail);
      if (storeUser) {
        user = storeUser;
        isStoreUser = true;
      }
    }

    // 2. CHECK WHETHER THE USER EXISTS (Specific email feedback)
    if (!user) {
      return renderLoginError("Email address not found. No account is registered with this email or username.");
    }

    // 3. COMPARE ENTERED PASSWORD WITH HASHED PASSWORD (Specific password feedback)
    let isMatch = false;
    if (isStoreUser) {
      isMatch = store.verifyPassword(password, user.passwordHash);
    } else if (typeof user.comparePassword === "function") {
      isMatch = await user.comparePassword(password);
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return renderLoginError("Incorrect password. The password you entered is incorrect. Please try again.");
    }

    // 4. SET THE LOGIN SESSION
    const userId = (user._id || user.id).toString();
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    const firstName = user.firstName || (fullName ? fullName.split(' ')[0] : 'User');
    const lastName = user.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
    const userRole = user.role || user.userType || 'user';

    req.session.isLoggedIn = true;
    req.session.userId = userId;
    req.session.user = {
      _id: userId,
      id: userId,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      email: user.email,
      username: user.username || firstName.toLowerCase(),
      userType: userRole,
      role: userRole,
      organization: user.organization || (userRole === 'host' ? 'Host Admin' : 'Personal'),
      createdAt: user.createdAt || new Date(),
    };

    if (remember === "on") {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    // 5. SAVE THE SESSION BEFORE REDIRECTING
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return res.redirect(safeRedirect);
  } catch (err) {
    console.error("[Login Error]:", err);
    return next(err);
  }
};

/**
 * POST & GET /logout
 * Destroy session and clear cookies
 */
exports.postLogout = exports.logoutUser = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie("connect.sid");
    res.redirect("/login?logged_out=1");
  });
};

/**
 * GET /signup
 * Render Sign Up page
 */
exports.getSignUp = exports.renderSignup = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/");
  }

  const renderData = {
    title: "Create Account",
    pageTitle: "Create your account",
    currentPage: "signup",
    page: "signup",
    isLoggedIn: Boolean(req.session && req.session.userId),
    errors: [],
    error: null,
    oldInput: {
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      username: "",
      password: "",
      userType: "user",
      role: "user",
    },
    formData: {
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      username: "",
      password: "",
      userType: "user",
      role: "user",
    },
    user: req.session ? req.session.user : null,
  };

  try {
    return res.render("signup", renderData);
  } catch (err) {
    return res.render("auth/signup", renderData);
  }
};

/**
 * POST /signup
 * User Registration with strict password requirements:
 * - At least 6 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&* etc.)
 */
exports.postSignUp = exports.registerUser = [
  check("firstName")
    .custom((val, { req }) => {
      const name = (req.body.firstName || req.body.fullName || "").trim();
      if (!name || name.length < 2) {
        throw new Error("First name / Full name should be at least 2 characters long");
      }
      if (!/^[A-Za-z\s]+$/.test(name)) {
        throw new Error("First name / Full name should contain only alphabetic characters");
      }
      return true;
    }),

  check("lastName")
    .optional({ checkFalsy: true })
    .matches(/^[A-Za-z\s]*$/)
    .withMessage("Last name should contain only alphabetic characters"),

  check("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .custom(async (value) => {
      const cleanEmail = value.trim().toLowerCase();
      if (isDbConnected()) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          throw new Error("An account with this email address already exists. Please sign in instead.");
        }
      } else {
        if (store.findUserByEmail(cleanEmail)) {
          throw new Error("An account with this email address already exists. Please sign in instead.");
        }
      }
      return true;
    })
    .normalizeEmail(),

  check("password")
    .isLength({ min: 6 })
    .withMessage("Password should be at least 6 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter (A-Z)")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter (a-z)")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number (0-9)")
    .matches(/[\W_]/)
    .withMessage("Password should contain at least one special character (!@#$%^&* etc.)")
    .trim(),

  check("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    })
    .trim(),

  check("userType")
    .optional({ checkFalsy: true })
    .isIn(["admin", "host", "guest", "user"])
    .withMessage("Invalid user type selected"),

  check("role")
    .optional({ checkFalsy: true })
    .isIn(["admin", "host", "guest", "user"])
    .withMessage("Invalid account role selected"),

  check("terms")
    .custom((val, { req }) => {
      if (!req.body.terms && !req.body.agreeTerms) {
        throw new Error("Please agree to the terms and conditions");
      }
      return true;
    }),

  async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        fullName,
        email,
        password,
        userType,
        role,
        username,
        organization,
      } = req.body;

      const effectiveFirstName = (firstName || (fullName ? fullName.split(' ')[0] : '')).trim();
      const effectiveLastName = (lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '')).trim();
      const effectiveFullName = fullName || `${effectiveFirstName} ${effectiveLastName}`.trim();
      const effectiveRole = userType === 'guest' ? 'user' : (userType || role || 'user');
      const effectiveUsername = username
        ? username.trim().toLowerCase()
        : (effectiveFirstName.toLowerCase() || email.split('@')[0].toLowerCase());

      const errors = validationResult(req);

      const oldInput = {
        firstName: effectiveFirstName,
        lastName: effectiveLastName,
        fullName: effectiveFullName,
        email: email || '',
        username: effectiveUsername,
        password: '',
        userType: effectiveRole,
        role: effectiveRole,
        organization: organization || '',
      };

      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        return res.status(422).render("signup", {
          title: "Create Account",
          pageTitle: "Create your account",
          currentPage: "signup",
          page: "signup",
          isLoggedIn: false,
          errors: errorMessages,
          error: errorMessages[0],
          oldInput: oldInput,
          formData: oldInput,
          user: req.session ? req.session.user : null,
        });
      }

      // Password Hashing with bcrypt (12 rounds)
      const hashedPassword = await bcrypt.hash(password, 12);
      const cleanEmail = email.trim().toLowerCase();

      let createdUser = null;

      if (isDbConnected()) {
        const userDoc = new User({
          firstName: effectiveFirstName,
          lastName: effectiveLastName,
          fullName: effectiveFullName,
          email: cleanEmail,
          username: effectiveUsername,
          password: hashedPassword,
          role: effectiveRole,
          userType: effectiveRole,
          organization: organization || (effectiveRole === 'host' ? 'Host Admin' : 'Personal'),
        });

        await userDoc.save();
        createdUser = {
          id: userDoc._id.toString(),
          _id: userDoc._id.toString(),
          firstName: userDoc.firstName,
          lastName: userDoc.lastName,
          fullName: userDoc.fullName,
          email: userDoc.email,
          username: userDoc.username,
          role: userDoc.role,
          userType: userDoc.userType,
          organization: userDoc.organization,
        };
      } else {
        const memoryUser = store.createUser({
          fullName: effectiveFullName,
          email: cleanEmail,
          username: effectiveUsername,
          password: password,
          role: effectiveRole,
          organization: organization || (effectiveRole === 'host' ? 'Host Admin' : 'Personal'),
        });
        createdUser = {
          id: memoryUser.id,
          _id: memoryUser.id,
          firstName: effectiveFirstName,
          lastName: effectiveLastName,
          fullName: memoryUser.fullName,
          email: memoryUser.email,
          username: memoryUser.username,
          role: memoryUser.role,
          userType: memoryUser.role,
          organization: memoryUser.organization,
        };
      }

      // Automatically sign in the user
      req.session.isLoggedIn = true;
      req.session.userId = createdUser.id;
      req.session.user = createdUser;

      await new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      return res.redirect("/?welcome=1");
    } catch (err) {
      console.error("[Signup Error]:", err);
      const errorMsg = err.message || "Failed to create account. Please try again.";
      return res.status(422).render("signup", {
        title: "Create Account",
        pageTitle: "Create your account",
        currentPage: "signup",
        page: "signup",
        isLoggedIn: false,
        errors: [errorMsg],
        error: errorMsg,
        oldInput: {
          firstName: req.body.firstName || "",
          lastName: req.body.lastName || "",
          fullName: req.body.fullName || "",
          email: req.body.email || "",
          userType: req.body.userType || req.body.role || "user",
          role: req.body.role || req.body.userType || "user",
        },
        formData: {
          firstName: req.body.firstName || "",
          lastName: req.body.lastName || "",
          fullName: req.body.fullName || "",
          email: req.body.email || "",
          userType: req.body.userType || req.body.role || "user",
          role: req.body.role || req.body.userType || "user",
        },
        user: req.session ? req.session.user : null,
      });
    }
  },
];

/**
 * GET /profile
 * Fetch authenticated user profile
 */
exports.getProfile = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login?redirect=/profile');
  }

  let user = null;
  try {
    if (isDbConnected()) {
      user = await User.findById(req.session.userId).select('-password');
    }
    if (!user) {
      user = store.findUserById(req.session.userId);
    }
  } catch (e) {
    user = store.findUserById(req.session.userId);
  }

  if (!user) {
    return res.redirect('/logout');
  }

  res.render('profile', {
    title: 'Profile — LinkPulse',
    page: 'profile',
    profileUser: user,
  });
};

/**
 * Middleware: Require Logged-In User
 */
exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl || '/'));
  }
  next();
};

/**
 * Middleware: Require Host or Admin Privileges
 */
exports.requireHost = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  const role = req.session.user.role || req.session.user.userType;
  if (role === 'host' || role === 'admin') {
    return next();
  }
  res.status(403).render('error-fallback', {
    type: 'disabled',
    message: 'Access restricted. This section requires Host or Administrator privileges.',
  });
};
