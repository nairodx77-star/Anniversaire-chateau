import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { initPaymentTracker } from "./paymentTracker.jsx";
import { initCarpoolModule } from "./carpool.jsx";

// Page-level modules mounted after the main React app is rendered.
function updateHousingFeesBlock() {
  const feesBox = document.querySelector(".fees-box");
  if (!feesBox) return false;

  const paragraph = feesBox.querySelector("p:not(.eyebrow)");
  if (paragraph) {
    paragraph.innerHTML =
      'Une participation de <strong>175 € par personne</strong> sera demandée pour couvrir les frais de logement. Pour le reste, on a prévu de vous recevoir comme il se doit : repas, champagne, bière et rosé seront de la partie.';
  }

  const links = Array.from(feesBox.querySelectorAll(".fees-actions a"));

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const label = (link.textContent || "").toLowerCase();

    if (href.includes("weropay") || label.includes("wero")) {
      link.remove();
      return;
    }

    if (href.includes("revolut") || label.includes("revolut")) {
      link.textContent = "Payer en ligne";
    }
  });

  return true;
}

function removeActivitiesSection() {
  const activitiesSection = document.querySelector(".activities-section");
  const activitiesNavLink = document.querySelector('.header nav a[href="#activites"]');

  if (activitiesSection) {
    activitiesSection.remove();
  }

  if (activitiesNavLink) {
    activitiesNavLink.remove();
  }

  return Boolean(activitiesSection || activitiesNavLink);
}

function keepPageCorrectionsUpdated() {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    updateHousingFeesBlock();
    removeActivitiesSection();

    if (attempts >= 120) {
      window.clearInterval(timer);
    }
  }, 250);

  window.addEventListener("load", () => {
    updateHousingFeesBlock();
    removeActivitiesSection();
  }, { once: true });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initPaymentTracker();
initCarpoolModule();
keepPageCorrectionsUpdated();
