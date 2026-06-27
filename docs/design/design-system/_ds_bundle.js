/* @ds-bundle: {"format":3,"namespace":"CairaDesignSystem_e5cfc1","components":[{"name":"CategoryTile","sourcePath":"components/caira/CategoryTile.jsx"},{"name":"ContactRow","sourcePath":"components/caira/ContactRow.jsx"},{"name":"CairaMark","sourcePath":"components/caira/Logo.jsx"},{"name":"Logo","sourcePath":"components/caira/Logo.jsx"},{"name":"OnCallButton","sourcePath":"components/caira/OnCallButton.jsx"},{"name":"PAPER_CATEGORIES","sourcePath":"components/caira/PaperIcon.jsx"},{"name":"PaperIcon","sourcePath":"components/caira/PaperIcon.jsx"},{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/navigation/SegmentedControl.jsx"}],"sourceHashes":{"components/caira/CategoryTile.jsx":"0c0159598830","components/caira/ContactRow.jsx":"89b5f91e9731","components/caira/Logo.jsx":"83e30500328a","components/caira/OnCallButton.jsx":"0367adb3f2b1","components/caira/PaperIcon.jsx":"565fcd24c3b3","components/core/Avatar.jsx":"f1beb764431e","components/core/Badge.jsx":"8ebaf624210f","components/core/Button.jsx":"a17ec2188866","components/core/Card.jsx":"3f5e31946326","components/core/Input.jsx":"6b110d05bd91","components/navigation/SegmentedControl.jsx":"4770bd659401","ui_kits/phone/PhoneFrame.jsx":"e774df5fbdfb","ui_kits/phone/TrackerScreen.jsx":"74f9c189b405","ui_kits/tablet/TabletCompanion.jsx":"9b3bb0ea67eb"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CairaDesignSystem_e5cfc1 = window.CairaDesignSystem_e5cfc1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/caira/Logo.jsx
try { (() => {
const HEART = "M32 49 C10 34 11 17 23 17 C28.5 17 31.5 21 32 24 C32.5 21 35.5 17 41 17 C53 17 54 34 32 49 Z";
const CARVE = "M29.5 18.5 A9 9 0 1 0 29.5 35.5";

/** The Caira heart-with-carved-C mark on its own. */
function CairaMark({
  size = 40,
  color = "var(--brand)",
  carve = "var(--surface)",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    style: {
      display: "block",
      overflow: "visible",
      ...style
    },
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: HEART,
    fill: color
  }), /*#__PURE__*/React.createElement("path", {
    d: CARVE,
    fill: "none",
    stroke: carve,
    strokeWidth: 5.5,
    strokeLinecap: "round",
    transform: "rotate(-18 21 27)"
  }));
}

/**
 * Caira logo lockup — the heart-with-C mark + "Caira" wordmark in Bricolage.
 * `variant="lockup"` is the default horizontal lockup; `"stacked"` centres the
 * mark over the wordmark + tagline; `"mark"` is the mark alone. Use `tone="white"`
 * on teal / dark grounds.
 */
function Logo({
  variant = "lockup",
  tone = "teal",
  size = 40,
  tagline = "SUPPORT, LOGGED WITH CARE",
  style = {}
}) {
  const teal = tone === "white" ? "#fff" : "var(--brand)";
  const carve = tone === "white" ? "var(--brand)" : "var(--surface)";
  const word = {
    font: `800 ${Math.round(size * 1)}px var(--font-display)`,
    color: teal,
    letterSpacing: "-0.01em",
    lineHeight: 1
  };
  if (variant === "mark") return /*#__PURE__*/React.createElement(CairaMark, {
    size: size,
    color: teal,
    carve: carve,
    style: style
  });
  if (variant === "stacked") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        ...style
      }
    }, /*#__PURE__*/React.createElement(CairaMark, {
      size: size,
      color: teal,
      carve: carve
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...word,
        fontSize: Math.round(size * 0.85)
      }
    }, "Caira"), tagline && /*#__PURE__*/React.createElement("span", {
      style: {
        font: "600 11px var(--font-sans-base)",
        letterSpacing: "0.14em",
        color: tone === "white" ? "rgba(255,255,255,.7)" : "var(--text-faint)"
      }
    }, tagline));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: Math.round(size * 0.32),
      ...style
    }
  }, /*#__PURE__*/React.createElement(CairaMark, {
    size: size,
    color: teal,
    carve: carve
  }), /*#__PURE__*/React.createElement("span", {
    style: word
  }, "Caira"));
}
Object.assign(__ds_scope, { CairaMark, Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/caira/Logo.jsx", error: String((e && e.message) || e) }); }

// components/caira/OnCallButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PhoneGlyph({
  size = 15,
  color = "#fff"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
  }));
}

/**
 * Caira OnCallButton — the emergency-hub one-tap call control. A calm clay pill:
 * a filled clay circle with a white phone glyph, plus the label. Warm, reassuring,
 * always reachable — never an alarming red.
 */
function OnCallButton({
  label = "On-call",
  onClick,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      height: 44,
      padding: "0 16px 0 6px",
      borderRadius: 999,
      border: "1px solid var(--clay-tint)",
      background: "var(--clay-tint)",
      cursor: "pointer",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 999,
      background: "var(--clay)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(PhoneGlyph, null)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 14px var(--font-sans-base)",
      color: "var(--clay-strong)"
    }
  }, label));
}
Object.assign(__ds_scope, { OnCallButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/caira/OnCallButton.jsx", error: String((e && e.message) || e) }); }

// components/caira/PaperIcon.jsx
try { (() => {
// The three rotated paper-cut blob outlines the design alternates between.
const BLOB = {
  A: "M28 5C40 5 51 11 50 26C49 40 45 51 27 51C12 51 6 40 7 26C8 13 16 5 28 5Z",
  B: "M27 5C41 4 52 12 50 27C49 41 43 52 26 51C12 50 5 41 7 25C9 12 17 6 27 5Z",
  C: "M28 4C41 5 51 12 51 27C51 41 44 52 27 51C13 50 5 40 6 26C7 12 17 4 28 4Z"
};

// Keyed by Caira log category. fill = paper blob, ink = stroked glyph.
const ICONS = {
  Food: {
    blob: BLOB.A,
    fill: "var(--cat-food-fill)",
    ink: "var(--cat-food-ink)",
    glyph: '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M16 3c-1.5 1-2 3-2 5s.5 3 2 3v10"/>'
  },
  Drink: {
    blob: BLOB.B,
    fill: "var(--cat-drink-fill)",
    ink: "var(--cat-drink-ink)",
    glyph: '<path d="M6 4h12l-1.1 14.2a2 2 0 0 1-2 1.8H9.1a2 2 0 0 1-2-1.8L6 4z"/><path d="M6.4 9h11.2"/>'
  },
  Hygiene: {
    blob: BLOB.A,
    fill: "var(--cat-hygiene-fill)",
    ink: "var(--cat-hygiene-ink)",
    glyph: '<path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z"/>'
  },
  Activity: {
    blob: BLOB.C,
    fill: "var(--cat-activity-fill)",
    ink: "var(--cat-activity-ink)",
    glyph: '<circle cx="13" cy="4.5" r="1.5"/><path d="M12 9l-2.5 4 3 2.5L11 21"/><path d="M12 9l3.5 1.5L18 9"/><path d="M12 9l-4 1"/>'
  },
  Toilet: {
    blob: BLOB.B,
    fill: "var(--cat-toilet-fill)",
    ink: "var(--cat-toilet-ink)",
    glyph: '<path d="M6 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M9 17v3"/><path d="M15 17v3"/>'
  },
  Medication: {
    blob: BLOB.A,
    fill: "var(--cat-meds-fill)",
    ink: "var(--cat-meds-ink)",
    glyph: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><line x1="9" y1="9" x2="15" y2="15"/>'
  }
};
const PAPER_CATEGORIES = Object.keys(ICONS);

/**
 * Caira "Paper" category icon — a soft cut-paper blob fill + a stroked line
 * glyph, in the category's tint. The signature iconography of the log surface.
 * Six categories: Food, Drink, Hygiene, Activity, Toilet, Medication.
 */
function PaperIcon({
  category,
  size = 46,
  style = {}
}) {
  const d = ICONS[category];
  if (!d) return null;
  const fid = `paperSh-${category}`;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 56 56",
    style: {
      overflow: "visible",
      ...style
    },
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("filter", {
    id: fid,
    x: "-40%",
    y: "-40%",
    width: "180%",
    height: "180%"
  }, /*#__PURE__*/React.createElement("feDropShadow", {
    dx: "0",
    dy: "2.5",
    stdDeviation: "2.2",
    floodColor: "#7a5a36",
    floodOpacity: "0.22"
  }))), /*#__PURE__*/React.createElement("path", {
    d: d.blob,
    fill: d.fill,
    filter: `url(#${fid})`
  }), /*#__PURE__*/React.createElement("g", {
    transform: "translate(16,16)",
    fill: "none",
    stroke: d.ink,
    strokeWidth: 2.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    dangerouslySetInnerHTML: {
      __html: d.glyph
    }
  }));
}
Object.assign(__ds_scope, { PAPER_CATEGORIES, PaperIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/caira/PaperIcon.jsx", error: String((e && e.message) || e) }); }

// components/caira/CategoryTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Caira CategoryTile — a square Paper-icon tile in the capture grid. Tapping one
 * logs that category (or opens its detail panel). Big, calm, thumb-friendly;
 * 44px+ target with a soft hover to the sunk surface.
 */
function CategoryTile({
  category,
  label,
  onClick,
  size = "grid",
  style = {},
  ...rest
}) {
  const aspect = size === "grid" ? "1 / 1" : undefined;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      aspectRatio: aspect,
      minHeight: 44,
      padding: 12,
      borderRadius: 20,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      cursor: "pointer",
      transition: "background .15s ease",
      ...style
    },
    onMouseEnter: e => e.currentTarget.style.background = "var(--surface-sunk)",
    onMouseLeave: e => e.currentTarget.style.background = "var(--surface)"
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.PaperIcon, {
    category: category,
    size: 46
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 13px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, label || category));
}
Object.assign(__ds_scope, { CategoryTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/caira/CategoryTile.jsx", error: String((e && e.message) || e) }); }

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Caira Avatar — initials on a soft tinted ground. Participants use a rounded
 * square with a teal frame (the "identity" treatment); key contacts use a small
 * tinted circle. No photos required — calm, legible, consistent.
 */
function Avatar({
  name = "",
  size = 44,
  shape = "circle",
  tone = "brand",
  style = {},
  ...rest
}) {
  const tones = {
    brand: {
      bg: "var(--brand-tint)",
      fg: "var(--brand-strong)"
    },
    clay: {
      bg: "var(--clay-tint)",
      fg: "var(--clay-strong)"
    },
    muted: {
      bg: "var(--surface-sunk)",
      fg: "var(--muted)"
    },
    paper: {
      bg: "#e7dcc6",
      fg: "var(--brand-strong)"
    }
  };
  const t = tones[tone] || tones.brand;
  const isFrame = shape === "rounded";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: size,
      height: size,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape === "circle" ? 999 : Math.round(size * 0.28),
      background: t.bg,
      color: t.fg,
      border: isFrame ? "2px solid var(--brand)" : "none",
      font: `700 ${Math.round(size * 0.36)}px var(--font-display)`,
      letterSpacing: "0.01em",
      ...style
    },
    "aria-hidden": true
  }, rest), initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/caira/ContactRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PhoneGlyph() {
  return /*#__PURE__*/React.createElement("svg", {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
  }));
}

/**
 * Caira ContactRow — a key-contact line: tinted initials avatar, name + role,
 * and a tappable teal phone number on the right. Used in the locked "Key contacts"
 * list on the in-shift screen.
 */
function ContactRow({
  name,
  role,
  phone,
  tone = "brand",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    size: 36,
    tone: tone
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, name), role && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 12px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, role)), phone && /*#__PURE__*/React.createElement("a", {
    href: `tel:${phone.replace(/\s+/g, "")}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "600 14px var(--font-sans-base)",
      color: "var(--brand)",
      textDecoration: "none",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(PhoneGlyph, null), phone));
}
Object.assign(__ds_scope, { ContactRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/caira/ContactRow.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Caira Badge / status pill — a small rounded label that reads state at a glance.
 * The "On shift" pill carries a live dot. Tones map to the brand's status colours;
 * urgency is always calm (reassurance over alarm), never a loud red.
 */
function Badge({
  tone = "neutral",
  dot = false,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      bg: "var(--surface-sunk)",
      fg: "var(--muted)"
    },
    status: {
      bg: "var(--status-bg)",
      fg: "var(--status)"
    },
    brand: {
      bg: "var(--brand-tint)",
      fg: "var(--brand-strong)"
    },
    clay: {
      bg: "var(--clay-tint)",
      fg: "var(--clay-strong)"
    },
    amber: {
      bg: "var(--amber-bg)",
      fg: "#a9781f"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 10px",
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      font: "700 11px var(--font-sans-base)",
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: "currentColor",
      flexShrink: 0
    },
    "aria-hidden": true
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Caira Button — the primary action control.
 * Soft 14px corners, bold Figtree label, calm teal fill. Hover darkens to
 * brand-strong; never harsh. Min height respects the 44px hit-target rule.
 */
function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  leftIcon = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 38,
      padding: "0 16px",
      fontSize: 14,
      radius: 12
    },
    md: {
      height: 48,
      padding: "0 20px",
      fontSize: 16,
      radius: 14
    },
    lg: {
      height: 56,
      padding: "0 24px",
      fontSize: 17,
      radius: 16
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "var(--text-on-brand)",
      border: "1px solid transparent"
    },
    secondary: {
      background: "var(--surface)",
      color: "var(--muted)",
      border: "1px solid var(--border)"
    },
    ghost: {
      background: "transparent",
      color: "var(--brand)",
      border: "1px solid transparent"
    },
    danger: {
      background: "var(--clay)",
      color: "#fff",
      border: "1px solid transparent"
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: s.height,
      minHeight: 44,
      padding: s.padding,
      width: fullWidth ? "100%" : undefined,
      borderRadius: s.radius,
      font: `700 ${s.fontSize}px var(--font-sans-base)`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      transition: "background .15s ease, opacity .15s ease",
      ...v,
      ...style
    },
    onMouseEnter: e => {
      if (disabled) return;
      if (variant === "primary") e.currentTarget.style.background = "var(--brand-strong)";else if (variant === "danger") e.currentTarget.style.background = "var(--clay-strong)";else if (variant === "secondary") e.currentTarget.style.background = "var(--surface-sunk)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = v.background;
    }
  }, rest), leftIcon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Caira Card — a warm-paper surface that barely lifts off the canvas.
 * The default container for content groups. Soft 16–22px corners, hairline
 * border, low warm-tinted shadow. Use `tone="sunk"` for inset wells and
 * `tone="brand"` for selected/branded panels.
 */
function Card({
  tone = "surface",
  padding = 20,
  radius = 16,
  style = {},
  children,
  ...rest
}) {
  const tones = {
    surface: {
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-card)"
    },
    flat: {
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      boxShadow: "none"
    },
    sunk: {
      background: "var(--surface-well)",
      border: "1px solid var(--border)",
      boxShadow: "none"
    },
    brand: {
      background: "var(--brand-tint)",
      border: "1px solid var(--brand-tint)",
      boxShadow: "none"
    }
  };
  const t = tones[tone] || tones.surface;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: radius,
      padding,
      color: "var(--foreground)",
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Caira Input / Textarea — a paper-surface field with a hairline border that
 * warms to teal on focus. Generous padding and 16px text so it's legible and
 * tap-friendly. Pass `multiline` for a textarea.
 */
function Input({
  label,
  hint,
  multiline = false,
  rows = 2,
  id,
  style = {},
  ...rest
}) {
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const fieldStyle = {
    width: "100%",
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "12px 16px",
    font: "400 16px var(--font-sans-base)",
    color: "var(--foreground)",
    outline: "none",
    resize: multiline ? "vertical" : undefined,
    transition: "border-color .15s ease",
    ...style
  };
  const onFocus = e => e.currentTarget.style.borderColor = "var(--brand)";
  const onBlur = e => e.currentTarget.style.borderColor = "var(--border)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      font: "600 14px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, label), multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    id: fieldId,
    rows: rows,
    style: fieldStyle,
    onFocus: onFocus,
    onBlur: onBlur
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    style: fieldStyle,
    onFocus: onFocus,
    onBlur: onBlur
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 13px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedControl.jsx
try { (() => {
/**
 * Caira SegmentedControl — a sunk paper track holding pill options; the active
 * one fills teal. Used for the Capture / Timeline switch (and the Mic · Capture ·
 * Timeline variant where the first option is icon-only). 44px tall options.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  style = {}
}) {
  const cols = options.map(o => o.iconOnly ? "56px" : "1fr").join(" ");
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "grid",
      gridTemplateColumns: cols,
      gap: 4,
      padding: 4,
      borderRadius: 16,
      background: "var(--surface-sunk)",
      ...style
    }
  }, options.map(o => {
    const active = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "tab",
      "aria-selected": active,
      "aria-label": o.iconOnly ? o.label : undefined,
      onClick: () => onChange && onChange(o.value),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 44,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: active ? "var(--brand)" : "transparent",
        color: active ? "var(--text-on-brand)" : "var(--muted)",
        boxShadow: active ? "var(--shadow-soft)" : "none",
        font: "700 14px var(--font-sans-base)",
        transition: "background .15s ease, color .15s ease"
      }
    }, o.icon, !o.iconOnly && (o.label || o.value));
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// ui_kits/phone/PhoneFrame.jsx
try { (() => {
// PhoneFrame — a calm iPhone-style bezel for the Caira phone surface.
// Pure presentation; children render inside the screen area.
function PhoneFrame({
  children,
  width = 390
}) {
  const scale = width / 390;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height: 844 * scale,
      borderRadius: 56 * scale,
      background: "#1c1b1a",
      padding: 11 * scale,
      boxShadow: "0 30px 70px rgba(40,34,24,.30)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      borderRadius: 46 * scale,
      overflow: "hidden",
      background: "var(--background)",
      position: "relative",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 52 * scale,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${26 * scale}px`,
      font: `600 ${15 * scale}px var(--font-sans-base)`,
      color: "var(--foreground)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: 11 * scale,
      transform: "translateX(-50%)",
      width: 112 * scale,
      height: 32 * scale,
      background: "#1c1b1a",
      borderRadius: 999
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6 * scale,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: 17 * scale,
    height: 11 * scale,
    viewBox: "0 0 17 11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "6",
    width: "3",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "4",
    width: "3",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "3",
    height: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "11",
    rx: "1"
  })), /*#__PURE__*/React.createElement("svg", {
    width: 16 * scale,
    height: 11 * scale,
    viewBox: "0 0 16 11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2.5c2 0 3.8.8 5.2 2.1l1.1-1.2A9 9 0 0 0 8 .8 9 9 0 0 0 1.7 3.4l1.1 1.2A7.4 7.4 0 0 1 8 2.5Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6c1 0 2 .4 2.7 1.1l1.1-1.2A6 6 0 0 0 8 4.3a6 6 0 0 0-3.8 1.6l1.1 1.2A4 4 0 0 1 8 6Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "9.3",
    r: "1.5"
  })), /*#__PURE__*/React.createElement("svg", {
    width: 25 * scale,
    height: 12 * scale,
    viewBox: "0 0 25 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "1",
    width: "20",
    height: "10",
    rx: "3",
    stroke: "currentColor",
    opacity: "0.4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2.5",
    y: "2.5",
    width: "16",
    height: "7",
    rx: "1.5",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "22.5",
    y: "4",
    width: "1.5",
    height: "4",
    rx: "0.75",
    fill: "currentColor",
    opacity: "0.4"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, children)));
}
window.PhoneFrame = PhoneFrame;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/phone/PhoneFrame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/phone/TrackerScreen.jsx
try { (() => {
// TrackerScreen — Caira in-shift capture (phone). Recreated from
// docs/design/Caira Tracker.dc.html + ShiftTracker.tsx. Composes the design
// system's components; all actions are mocks (log into an in-memory timeline).
const C = window.CairaDesignSystem_e5cfc1;

// Quick-option chips per category (placeholder scaffolds, per HANDOFF).
const QUICK = {
  Food: ["Breakfast", "Lunch", "Dinner", "Snack", "Most", "Half", "Little"],
  Drink: ["Water", "Tea", "Juice", "Full glass", "Half", "Sips"],
  Hygiene: ["Shower", "Wash", "Teeth", "Dressed", "Toileting"],
  Activity: ["Walk", "Outing", "Exercise", "Social", "Rest"],
  Toilet: ["Continent", "Assisted", "Incontinent", "BO"],
  Medication: ["Given", "Refused", "Self-admin", "PRN"]
};
function nowTime() {
  return new Date().toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  });
}
function MicGlyph({
  size = 17
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "6",
    height: "12",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 10a7 7 0 0 0 14 0"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "22"
  }));
}
function Chip({
  active,
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      padding: "9px 14px",
      borderRadius: 999,
      cursor: "pointer",
      border: active ? "1px solid var(--brand)" : "1px solid var(--border)",
      background: active ? "var(--brand-tint)" : "var(--surface)",
      color: active ? "var(--brand-strong)" : "var(--foreground)",
      font: "600 13px var(--font-sans-base)"
    }
  }, children);
}
function SectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      margin: "2px 0 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 11px var(--font-sans-base)",
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, children), right);
}
function TrackerScreen() {
  const [view, setView] = React.useState("capture");
  const [selected, setSelected] = React.useState(null);
  const [chips, setChips] = React.useState([]);
  const [note, setNote] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [voiceNote, setVoiceNote] = React.useState("");
  const [log, setLog] = React.useState([{
    id: 1,
    cat: "Food",
    time: "13:20",
    text: "Lunch · most eaten"
  }, {
    id: 2,
    cat: "Drink",
    time: "14:05",
    text: "Water · full glass"
  }]);
  function open(cat) {
    setSelected(cat);
    setChips([]);
    setNote("");
  }
  function toggleChip(c) {
    setChips(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);
  }
  function saveEntry() {
    const text = [chips.join(" · "), note].filter(Boolean).join(" — ") || "Logged";
    setLog(l => [{
      id: Date.now(),
      cat: selected,
      time: nowTime(),
      text
    }, ...l]);
    setSelected(null);
  }
  function saveVoice() {
    if (!voiceNote.trim()) return;
    setLog(l => [{
      id: Date.now(),
      cat: "Note",
      time: nowTime(),
      text: voiceNote
    }, ...l]);
    setVoiceNote("");
    setRecording(false);
    setView("capture");
  }
  const contacts = [{
    name: "S. Hale",
    role: "Coordinator",
    tone: "brand"
  }, {
    name: "M. Doe",
    role: "Next of kin",
    tone: "clay"
  }, {
    name: "Dr Park",
    role: "GP",
    tone: "muted"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 18px 12px"
    }
  }, /*#__PURE__*/React.createElement(C.Logo, {
    size: 26
  }), /*#__PURE__*/React.createElement(C.OnCallButton, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: "0 18px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(C.Card, {
    padding: 14,
    radius: 20,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(C.Avatar, {
    name: "John Donnelly",
    size: 64,
    shape: "rounded",
    tone: "paper"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "800 21px var(--font-display)",
      color: "var(--foreground)",
      letterSpacing: "-.01em"
    }
  }, "John Donnelly"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 13px var(--font-sans-base)",
      color: "var(--muted)",
      margin: "3px 0 8px"
    }
  }, "Shift 13:00 \u2013 21:00"), /*#__PURE__*/React.createElement(C.Badge, {
    tone: "status",
    dot: true
  }, "ON SHIFT \xB7 07:31 ELAPSED"))), /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        font: "600 12px var(--font-sans-base)",
        color: "var(--brand)"
      }
    }, "View all")
  }, "Key contacts"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 10
    }
  }, contacts.map(c => /*#__PURE__*/React.createElement(C.Card, {
    key: c.name,
    tone: "flat",
    padding: 10,
    radius: 16,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(C.Avatar, {
    name: c.name,
    size: 34,
    tone: c.tone
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 13px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 10px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, c.role))))), /*#__PURE__*/React.createElement(C.SegmentedControl, {
    value: view,
    onChange: v => {
      setView(v);
      setSelected(null);
    },
    options: [{
      value: "voice",
      label: "Voice note",
      icon: /*#__PURE__*/React.createElement(MicGlyph, null),
      iconOnly: true
    }, {
      value: "capture",
      label: "Capture"
    }, {
      value: "timeline",
      label: "Timeline"
    }]
  }), view === "capture" && selected === null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      font: "600 11px var(--font-sans-base)",
      color: "var(--muted)",
      margin: 0
    }
  }, "Tap a category to log \u2014 or tap the mic for a voice note"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 10
    }
  }, C.PAPER_CATEGORIES.map(cat => /*#__PURE__*/React.createElement(C.CategoryTile, {
    key: cat,
    category: cat,
    onClick: () => open(cat)
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => open("Incident"),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 46,
      borderRadius: 14,
      cursor: "pointer",
      border: "1px solid var(--incident-line)",
      background: "var(--incident-bg)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "var(--incident-dot)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "800 12px var(--font-sans-base)",
      letterSpacing: ".06em",
      color: "var(--incident-text)"
    }
  }, "REPORT AN INCIDENT"))), view === "capture" && selected !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(C.Card, {
    padding: 12,
    radius: 16,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, C.PAPER_CATEGORIES.includes(selected) ? /*#__PURE__*/React.createElement(C.PaperIcon, {
    category: selected,
    size: 38
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 999,
      background: "var(--incident-bg)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 999,
      background: "var(--incident-dot)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 18px var(--font-display)",
      color: "var(--foreground)"
    }
  }, selected), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(C.Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setSelected(null)
  }, "\u2190 Back"))), QUICK[selected] && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SectionLabel, null, "Quick options"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, QUICK[selected].map(c => /*#__PURE__*/React.createElement(Chip, {
    key: c,
    active: chips.includes(c),
    onClick: () => toggleChip(c)
  }, c)))), /*#__PURE__*/React.createElement(C.Input, {
    label: "Add a note (optional)",
    multiline: true,
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "e.g. add any detail worth noting"
  }), /*#__PURE__*/React.createElement(C.Button, {
    fullWidth: true,
    onClick: saveEntry
  }, "Save ", selected)), view === "voice" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setRecording(r => !r),
    style: {
      width: 92,
      height: 92,
      borderRadius: 999,
      border: "none",
      cursor: "pointer",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: recording ? "#b23a28" : "var(--clay)",
      boxShadow: recording ? "0 0 0 10px rgba(223,91,64,.16)" : "var(--shadow-pop)",
      transition: "box-shadow .2s ease"
    }
  }, /*#__PURE__*/React.createElement(MicGlyph, {
    size: 32
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 16px var(--font-display)",
      color: "var(--foreground)"
    }
  }, recording ? "Recording…" : "Tap to record"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 11px var(--font-sans-base)",
      color: "var(--muted)",
      marginTop: 4
    }
  }, "Voice transcription is coming soon \u2014 type your note below.")), /*#__PURE__*/React.createElement(C.Input, {
    multiline: true,
    rows: 4,
    value: voiceNote,
    onChange: e => setVoiceNote(e.target.value),
    placeholder: "Transcript appears here \u2014 or type a note\u2026",
    style: {
      width: "100%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(C.Button, {
    variant: "secondary",
    onClick: () => setView("capture"),
    style: {
      width: 110
    }
  }, "Cancel"), /*#__PURE__*/React.createElement(C.Button, {
    fullWidth: true,
    onClick: saveVoice
  }, "Save voice note"))), view === "timeline" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, log.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "var(--muted)",
      font: "400 14px var(--font-sans-base)"
    }
  }, "No entries yet."), log.map(e => /*#__PURE__*/React.createElement(C.Card, {
    key: e.id,
    tone: "flat",
    padding: 12,
    radius: 16,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, C.PAPER_CATEGORIES.includes(e.cat) ? /*#__PURE__*/React.createElement(C.PaperIcon, {
    category: e.cat,
    size: 34
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: "var(--surface-sunk)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "700 11px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, "Note"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 14px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, e.cat), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 13px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, e.text)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 12px var(--font-sans-base)",
      color: "var(--text-faint)"
    }
  }, e.time))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px",
      borderTop: "1px solid var(--border)",
      background: "var(--surface)"
    }
  }, /*#__PURE__*/React.createElement(C.Button, {
    variant: "primary",
    fullWidth: true,
    size: "lg"
  }, "Finish shift")));
}
window.TrackerScreen = TrackerScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/phone/TrackerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tablet/TabletCompanion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// TabletCompanion — Caira "Tablet A · Companion": one participant, in-shift.
// Recreated from docs/design/Caira Tablet & Web.dc.html + screenshots.
// Persistent identity rail on the left; capture stays in the thumb-reachable
// right pane. Composes the design system components; actions are mocks.
const TC = window.CairaDesignSystem_e5cfc1;
const TQUICK = {
  Food: ["Breakfast", "Lunch", "Dinner", "Snack", "Most", "Half", "Little"],
  Drink: ["Water", "Tea", "Juice", "Full glass", "Half", "Sips"],
  Hygiene: ["Shower", "Wash", "Teeth", "Dressed"],
  Activity: ["Walk", "Outing", "Exercise", "Social", "Rest"],
  Toilet: ["Continent", "Assisted", "Incontinent"],
  Medication: ["Given", "Refused", "Self-admin", "PRN"]
};
const tnow = () => new Date().toLocaleTimeString("en-AU", {
  hour: "numeric",
  minute: "2-digit"
});
function TMic({
  size = 18
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "6",
    height: "12",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 10a7 7 0 0 0 14 0"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "22"
  }));
}
function TChip({
  active,
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      padding: "10px 16px",
      borderRadius: 999,
      cursor: "pointer",
      border: active ? "1px solid var(--brand)" : "1px solid var(--border)",
      background: active ? "var(--brand-tint)" : "var(--surface)",
      color: active ? "var(--brand-strong)" : "var(--foreground)",
      font: "600 14px var(--font-sans-base)"
    }
  }, children);
}
function TabletCompanion() {
  const [view, setView] = React.useState("capture");
  const [selected, setSelected] = React.useState(null);
  const [chips, setChips] = React.useState([]);
  const [note, setNote] = React.useState("");
  const [log, setLog] = React.useState([{
    id: 1,
    cat: "Food",
    time: "13:20",
    text: "Lunch · most eaten"
  }, {
    id: 2,
    cat: "Activity",
    time: "15:10",
    text: "Walk in the garden, 20 min"
  }, {
    id: 3,
    cat: "Drink",
    time: "16:00",
    text: "Water · full glass"
  }]);
  function open(cat) {
    setSelected(cat);
    setChips([]);
    setNote("");
  }
  function toggleChip(c) {
    setChips(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);
  }
  function save() {
    const text = [chips.join(" · "), note].filter(Boolean).join(" — ") || "Logged";
    setLog(l => [{
      id: Date.now(),
      cat: selected,
      time: tnow(),
      text
    }, ...l]);
    setSelected(null);
  }
  const contacts = [{
    name: "S. Hale",
    role: "Coordinator",
    phone: "0412 345 678",
    tone: "brand"
  }, {
    name: "M. Doe",
    role: "Next of kin",
    phone: "0438 920 114",
    tone: "clay"
  }, {
    name: "Dr Park",
    role: "GP · Northside Clinic",
    phone: "02 9123 4567",
    tone: "muted"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 980,
      height: 680,
      display: "grid",
      gridTemplateColumns: "340px 1fr",
      background: "var(--surface)",
      borderRadius: 28,
      overflow: "hidden",
      boxShadow: "0 30px 70px rgba(40,34,24,.22)",
      border: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--background)",
      borderRight: "1px solid var(--border)",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(TC.Logo, {
    size: 28
  }), /*#__PURE__*/React.createElement(TC.OnCallButton, null)), /*#__PURE__*/React.createElement(TC.Avatar, {
    name: "John Donnelly",
    size: 120,
    shape: "rounded",
    tone: "paper",
    style: {
      marginTop: 4
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "800 30px var(--font-display)",
      color: "var(--foreground)",
      letterSpacing: "-.01em"
    }
  }, "John Donnelly"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 14px var(--font-sans-base)",
      color: "var(--muted)",
      margin: "6px 0 10px"
    }
  }, "Shift 13:00 \u2013 21:00"), /*#__PURE__*/React.createElement(TC.Badge, {
    tone: "status",
    dot: true
  }, "ON SHIFT \xB7 07:31")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 11px var(--font-sans-base)",
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      marginTop: 4
    }
  }, "Key contacts"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, contacts.map(c => /*#__PURE__*/React.createElement(TC.ContactRow, _extends({
    key: c.name
  }, c))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement(TC.SegmentedControl, {
    value: view,
    onChange: v => {
      setView(v);
      setSelected(null);
    },
    options: [{
      value: "capture",
      label: "Capture"
    }, {
      value: "timeline",
      label: "Timeline"
    }]
  })), view === "capture" && selected === null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px var(--font-sans-base)",
      color: "var(--muted)",
      margin: 0
    }
  }, "Tap a category to log, record a voice note, or type below"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 14
    }
  }, TC.PAPER_CATEGORIES.map(cat => /*#__PURE__*/React.createElement(TC.CategoryTile, {
    key: cat,
    category: cat,
    onClick: () => open(cat)
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      height: 60,
      borderRadius: 16,
      cursor: "pointer",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 999,
      background: "var(--clay)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "var(--shadow-pop)"
    }
  }, /*#__PURE__*/React.createElement(TMic, null)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 15px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, "Tap to record a voice note"))), view === "capture" && selected !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement(TC.Card, {
    padding: 14,
    radius: 16,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, TC.PAPER_CATEGORIES.includes(selected) ? /*#__PURE__*/React.createElement(TC.PaperIcon, {
    category: selected,
    size: 44
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 999,
      background: "var(--incident-bg)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 999,
      background: "var(--incident-dot)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "800 22px var(--font-display)",
      color: "var(--foreground)"
    }
  }, selected), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(TC.Button, {
    variant: "secondary",
    onClick: () => setSelected(null)
  }, "\u2190 Back"))), TQUICK[selected] && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10
    }
  }, TQUICK[selected].map(c => /*#__PURE__*/React.createElement(TChip, {
    key: c,
    active: chips.includes(c),
    onClick: () => toggleChip(c)
  }, c))), /*#__PURE__*/React.createElement(TC.Input, {
    label: "Add a note (optional)",
    multiline: true,
    rows: 3,
    value: note,
    onChange: e => setNote(e.target.value),
    placeholder: "e.g. add any detail worth noting"
  }), /*#__PURE__*/React.createElement(TC.Button, {
    size: "lg",
    onClick: save,
    style: {
      alignSelf: "flex-start",
      minWidth: 200
    }
  }, "Save ", selected)), view === "timeline" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      overflowY: "auto"
    }
  }, log.map(e => /*#__PURE__*/React.createElement(TC.Card, {
    key: e.id,
    tone: "flat",
    padding: 14,
    radius: 16,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, TC.PAPER_CATEGORIES.includes(e.cat) ? /*#__PURE__*/React.createElement(TC.PaperIcon, {
    category: e.cat,
    size: 38
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: "var(--surface-sunk)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      font: "700 12px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, "Note"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 15px var(--font-sans-base)",
      color: "var(--foreground)"
    }
  }, e.cat), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 14px var(--font-sans-base)",
      color: "var(--muted)"
    }
  }, e.text)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 13px var(--font-sans-base)",
      color: "var(--text-faint)"
    }
  }, e.time)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(TC.Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true
  }, "Finish shift"))));
}
window.TabletCompanion = TabletCompanion;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tablet/TabletCompanion.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CategoryTile = __ds_scope.CategoryTile;

__ds_ns.ContactRow = __ds_scope.ContactRow;

__ds_ns.CairaMark = __ds_scope.CairaMark;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.OnCallButton = __ds_scope.OnCallButton;

__ds_ns.PAPER_CATEGORIES = __ds_scope.PAPER_CATEGORIES;

__ds_ns.PaperIcon = __ds_scope.PaperIcon;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

})();
