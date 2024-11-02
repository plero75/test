//eeeeeee
// Constantes pour les noms des feuilles
const PLANNING_SHEET_NAME = 'Planning';
const DATAEVENT_SHEET_NAME = 'DATAEVENT';
const DATAVARIABLES_SHEET_NAME = 'DATAVARIABLES';

// Constantes pour les couleurs (défaut)
const DEFAULT_MONTAGE_COLOR = '#D3D3D3'; // Gris clair pour les périodes de montage et démontage
const DEFAULT_COURSE_HIGHLIGHT = '#f9e6e6'; // Teinte claire pour les jours de courses
const DEFAULT_SUNDAY_PLEASURE = '#FFA500'; // Orange pour les "Dimanches Plaisirs"
const DEFAULT_CONFLICT_COLOR = '#FF0000'; // Rouge pour les conflits
const DEFAULT_NON_CONFIRMED_BORDER = 'black'; // Bordure noire pour les événements non confirmés

// Fonction principale pour mettre à jour le planning à partir de DATAEVENTS
function updateAllFromDataEvents() {
  Logger.log('Début de la mise à jour du planning à partir de DATAEVENTS...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataEventSheet = ss.getSheetByName(DATAEVENT_SHEET_NAME);
  const planningSheet = ss.getSheetByName(PLANNING_SHEET_NAME);
  const datavariablesSheet = ss.getSheetByName(DATAVARIABLES_SHEET_NAME);
  
  if (!dataEventSheet || !planningSheet || !datavariablesSheet) {
    Logger.log('Une ou plusieurs feuilles requises sont introuvables.');
    return;
  }

  const colors = getColorsFromVariables(datavariablesSheet);
  const eventsData = dataEventSheet.getDataRange().getValues();

  eventsData.slice(1).forEach(event => {
    const [confirmed, eventName, responsible, startDate, endDate, setupDays, teardownDays, site, eventType, spaces, startTime] = event;

    if (eventName && startDate && site) {
      Logger.log(`Traitement de l'événement: ${eventName}`);
      const setupEndDate = addDays(new Date(startDate), setupDays - 1);
      const teardownStartDate = addDays(new Date(endDate), 1);
      const teardownEndDate = addDays(new Date(endDate), teardownDays);

      updatePlanningWithPeriods(
        planningSheet,
        startDate,
        setupEndDate,
        endDate,
        teardownStartDate,
        teardownEndDate,
        site,
        eventType,
        eventName,
        confirmed,
        startTime,
        colors
      );
    }
  });

  Logger.log('Mise à jour du planning terminée.');
}

// Récupérer les couleurs depuis DATAVARIABLES
function getColorsFromVariables(datavariablesSheet) {
  Logger.log('Récupération des couleurs depuis DATAVARIABLES...');
  return {
    types: {
      SETF: datavariablesSheet.getRange('B1').getBackground(),
      B2B: datavariablesSheet.getRange('B2').getBackground(),
      Institution: datavariablesSheet.getRange('B3').getBackground()
    },
    sites: {
      Vincennes: datavariablesSheet.getRange('B4').getBackground(),
      Enghien: datavariablesSheet.getRange('B5').getBackground(),
      Cabourg: datavariablesSheet.getRange('B6').getBackground()
    },
    montage: DEFAULT_MONTAGE_COLOR,
    nonConfirmedBorder: DEFAULT_NON_CONFIRMED_BORDER,
    courseHighlight: DEFAULT_COURSE_HIGHLIGHT,
    sundayPleasure: DEFAULT_SUNDAY_PLEASURE,
    conflictColor: DEFAULT_CONFLICT_COLOR
  };
}

function updatePlanningWithPeriods(
  planningSheet,
  setupStart,
  setupEnd,
  eventStart,
  teardownStart,
  teardownEnd,
  site,
  eventType,
  eventName,
  confirmed,
  startTime,
  colors
) {
  Logger.log(`Mise à jour du planning pour l'événement: ${eventName} | Site: ${site} | Type: ${eventType}`);
  Logger.log(`Dates: Montage du ${setupStart} au ${setupEnd}, Événement le ${eventStart}, Démontage du ${teardownStart} au ${teardownEnd}`);
  const siteColor = colors.sites[site] || '#FFFFFF';
  const textColor = colors.types[eventType] || 'black';
  const borderColor = confirmed ? textColor : colors.nonConfirmedBorder;

  // Marquer la date de la course avec l'heure de début en gras dans la ligne 8
  markCourseDate(planningSheet, eventStart, startTime, colors);

  // Appliquer les périodes : Montage, Exploitation (Événement), Démontage
  applyPeriodToPlanning(planningSheet, setupStart, setupEnd, colors.montage, borderColor, eventName);
  applyPeriodToPlanning(planningSheet, eventStart, eventStart, siteColor, textColor, eventName, true, colors, 'event');
  applyPeriodToPlanning(planningSheet, teardownStart, teardownEnd, colors.montage, borderColor, eventName);
}


function markCourseDate(sheet, eventStart, startTime, colors) {
  Logger.log(`Marquage de la date de course pour le ${eventStart} avec heure de début: ${startTime}`);
  const dates = sheet.getRange('J8:J').getValues();
  
  dates.forEach((cellDate, rowIndex) => {
    // Si la cellule est vide, passer à la suivante
    if (!cellDate[0]) {
      Logger.log(`La cellule en colonne ${rowIndex + 10} est vide.`);
      return;
    }

    const date = new Date(cellDate[0]);

    // Vérifier si la cellule contient une date valide
    if (date instanceof Date && !isNaN(date)) {
      if (isSameDate(date, new Date(eventStart))) {
        const cell = sheet.getRange(8, rowIndex + 10);
        Logger.log(`Date de course trouvée dans la colonne ${rowIndex + 10}`);
        cell.setValue(startTime).setFontWeight('bold').setBackground(colors.courseHighlight);
      }
    } else {
      Logger.log(`La cellule en colonne ${rowIndex + 10} ne contient pas une date valide : ${cellDate[0]}`);
    }
  });
}


// Applique une période spécifique dans la feuille de planning avec gestion des conflits et "Dimanches Plaisirs"
function applyPeriodToPlanning(sheet, start, end, bgColor, borderColor, eventName, bold = false, colors, periodType = 'other') {
  Logger.log(`Application de la période: ${periodType} pour l'événement: ${eventName} du ${start} au ${end}`);
  const dates = sheet.getRange('J7:J').getValues();
  dates.forEach((cellDate, rowIndex) => {
    const date = new Date(cellDate[0]);
    const cell = sheet.getRange(rowIndex + 7, 10);

    if (date >= new Date(start) && date <= new Date(end)) {
      // Gérer les conflits d'événements et courses en colorant en rouge
      if (periodType === 'event' && cell.getValue()) {
        Logger.log(`Conflit détecté pour l'événement: ${eventName} à la colonne ${10 + rowIndex}`);
        cell.setBackground(colors.conflictColor);
      } else {
        cell.setValue(eventName);
        cell.setBackground(bgColor);
        cell.setFontWeight(bold ? 'bold' : 'normal');
        cell.setFontColor(borderColor);
        cell.setBorder(true, true, true, true, true, true, borderColor, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
      }
      
      // Mise en surbrillance des "Dimanches Plaisirs" en orange
      if (isSundayPleasure(date)) {
        Logger.log(`"Dimanche Plaisir" détecté pour la date: ${date}`);
        cell.setBackground(colors.sundayPleasure);
      }
    }
  });
}

// Vérifier si une date est un "Dimanche Plaisir"
function isSundayPleasure(date) {
  Logger.log(`Vérification de "Dimanche Plaisir" pour la date: ${date}`);
  return date.getDay() === 0; // Renvoie true pour le dimanche
}

// Fonction pour ajouter des jours à une date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  Logger.log(`Ajout de ${days} jours à la date: ${date} -> Nouvelle date: ${result}`);
  return result;
}

// Fonction utilitaire pour comparer deux dates sans l'heure
function isSameDate(date1, date2) {
  const sameDate = (
    date1 instanceof Date &&
    date2 instanceof Date &&
    date1.toDateString() === date2.toDateString()
  );
  Logger.log(`Comparaison de dates: ${date1} et ${date2} -> Même date: ${sameDate}`);
  return sameDate;
}

// Déclencheur onEdit pour surveiller les modifications dans la feuille DATAEVENT et mettre à jour le planning
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() === DATAEVENT_SHEET_NAME) {
    Logger.log('Modification détectée dans DATAEVENT. Mise à jour du planning...');
    updateAllFromDataEvents();
  }
}

// Déclencheur onOpen pour ajouter un menu personnalisé lors de l'ouverture du fichier
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Outils de Gestion')
    .addItem('Mettre à jour le planning', 'updateAllFromDataEvents')
    .addItem('Masquer les dates passées', 'hidePastColumns')
    .addToUi();
  Logger.log('Menu personnalisé ajouté avec succès');
}

// Fonction pour masquer les colonnes des dates passées dans la feuille Planning
function hidePastColumns() {
  const planningSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PLANNING_SHEET_NAME);
  if (!planningSheet) {
    Logger.log('Feuille Planning introuvable.');
    return;
  }

  Logger.log('Masquage des colonnes des dates passées...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normaliser à minuit pour éviter les erreurs de comparaison

  const dateRow = planningSheet.getRange('J8:J').getValues(); // Ligne 8 à partir de la colonne J
  const lastColumn = planningSheet.getLastColumn();

  for (let col = 10; col <= lastColumn; col++) { // Commence à la colonne 10 (colonne J)
    const cellDate = dateRow[col - 10][0]; // Récupère la date dans la cellule de la ligne 8
    if (cellDate instanceof Date) { // Vérifie si la cellule contient une date
      if (cellDate < today) {
        Logger.log(`Masquage de la colonne ${col} pour la date passée: ${cellDate}`);
        planningSheet.hideColumns(col); // Masque la colonne si la date est passée
      } else {
        planningSheet.showColumns(col); // Affiche la colonne si la date est aujourd'hui ou à venir
      }
    }
  }

  Logger.log('Masquage des colonnes des dates passées terminé.');
}
