import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./reservationLayout.css";
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

function updateFridayProgramBlock() {
  const cards = Array.from(document.querySelectorAll(".weekend-card"));
  const fridayCard = cards.find((card) => card.textContent.includes("Vendredi 17 juillet"));

  if (!fridayCard) return false;

  const paragraph = fridayCard.querySelector("p");
  if (!paragraph) return false;

  paragraph.textContent =
    "Arrivée à partir de 16h, installation dans les chambres, découverte du domaine, piscine et rosé pour se remettre du trajet, puis apéritif d’accueil à partir de 19h00, repas à partir de 20h30. Notre maître crêpier sera à votre disposition à son stand pour crêpes salées et sucrées à volonté. Ensuite, soirée dans une ambiance musicale.";

  return true;
}

function moveReservationAdminToEnd() {
  const adminSection = document.querySelector(".admin-section");
  const carpoolMount = document.querySelector(".carpool-mount");
  const main = document.querySelector("main");

  if (!adminSection || !main) return false;

  if (carpoolMount) {
    if (carpoolMount.nextElementSibling !== adminSection) {
      carpoolMount.insertAdjacentElement("afterend", adminSection);
    }
    return true;
  }

  if (main.lastElementChild !== adminSection) {
    main.appendChild(adminSection);
  }

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

function addFooterHeart() {
  const footerContainer = document.querySelector(".footer .container");
  if (!footerContainer) return false;

  if (footerContainer.querySelector(".footer-heart")) return true;

  const heart = document.createElement("span");
  heart.className = "footer-heart";
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");

  Object.assign(heart.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    border: "1px solid rgba(176, 138, 87, 0.35)",
    borderRadius: "999px",
    color: "#b08a57",
    background: "rgba(255, 253, 248, 0.58)",
    fontSize: "1.05rem",
    lineHeight: "1",
  });

  footerContainer.appendChild(heart);
  return true;
}

function keepPageCorrectionsUpdated() {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    updateHousingFeesBlock();
    updateFridayProgramBlock();
    moveReservationAdminToEnd();
    removeActivitiesSection();
    addFooterHeart();

    if (attempts >= 120) {
      window.clearInterval(timer);
    }
  }, 250);

  window.addEventListener("load", () => {
    updateHousingFeesBlock();
    updateFridayProgramBlock();
    moveReservationAdminToEnd();
    removeActivitiesSection();
    addFooterHeart();
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
