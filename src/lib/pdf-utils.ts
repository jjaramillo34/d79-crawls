import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type definition for autoTable function

interface Registration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school: string;
  registeredAt: string;
}

interface LocationStat {
  _id: string;
  name: string;
  address: string;
  eventTitle?: string;
  eventDate: string; // display label, e.g. "Friday, Nov 6"

  registrationCount: number;
  maxCapacity: number;
  availableSpots: number;
  registrations: Registration[];
}

// Callers pass only the locations to include, plus a heading such as "ALL EVENTS" or "FRIDAY, NOV 6"
export function generateParticipantsPDF(locationStats: LocationStat[], heading: string) {
  const doc = new jsPDF();

  // Check if we have any locations with registrations
  const locationsWithRegistrations = locationStats.filter(location => location.registrations.length > 0);

  if (locationsWithRegistrations.length === 0) {
    // Add a message if no registrations found
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('No registrations found for the selected event(s)', 105, 50, { align: 'center' });
    return doc;
  }

  // Add header
  doc.setFontSize(20);
  doc.setTextColor(236, 198, 127); // D79 golden color
  doc.text('DISTRICT 79 FALL CRAWLS', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`PARTICIPANT REGISTRATIONS - ${heading.toUpperCase()}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

  let startY = 50;

  // Generate table for each location
  locationsWithRegistrations.forEach((location, locationIndex) => {
    if (location.registrations.length === 0) return;

    // Add location header
    doc.setFontSize(14);
    doc.setTextColor(236, 198, 127);
    doc.text(`${location.name}`, 14, startY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${location.address}`, 14, startY + 5);
    doc.text(`${location.eventDate} - ${location.registrationCount}/${location.maxCapacity} participants`, 14, startY + 10);

    // Prepare table data
    const tableData = location.registrations.map((reg, index) => [
      index + 1,
      `${reg.firstName} ${reg.lastName}`,
      reg.email,
      reg.school
    ]);

    // Generate table
    autoTable(doc, {
      head: [['#', 'Name', 'Email', 'School']],
      body: tableData,
      startY: startY + 15,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [236, 198, 127], // D79 golden color
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // #
        1: { cellWidth: 50 }, // Name
        2: { cellWidth: 60 }, // Email
        3: { cellWidth: 50 }, // School
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'wrap',
    });

    // Update startY for next location
    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // Add page break if needed (except for last location)
    if (locationIndex < locationsWithRegistrations.length - 1 && startY > 250) {
      doc.addPage();
      startY = 20;
    }
  });

  // Add footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
}

export function downloadParticipantsPDF(locationStats: LocationStat[], heading: string) {
  const doc = generateParticipantsPDF(locationStats, heading);
  const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fileName = `d79-participants-${slug}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function generateSummaryPDF(locationStats: LocationStat[]) {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.setTextColor(236, 198, 127); // D79 golden color
  doc.text('DISTRICT 79 FALL CRAWLS', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('REGISTRATION SUMMARY', 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

  // Calculate totals
  const totalRegistrations = locationStats.reduce((sum, location) => sum + location.registrationCount, 0);
  // Totals per session (title + date)
  const sessionTotals = new Map<string, number>();
  for (const location of locationStats) {
    const key = location.eventTitle ? `${location.eventTitle} (${location.eventDate})` : location.eventDate;
    sessionTotals.set(key, (sessionTotals.get(key) || 0) + location.registrationCount);
  }

  // Add summary statistics
  doc.setFontSize(14);
  doc.setTextColor(236, 198, 127);
  doc.text('SUMMARY STATISTICS', 14, 60);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Registrations: ${totalRegistrations}`, 14, 75);
  let summaryY = 85;
  for (const [session, total] of sessionTotals) {
    doc.text(`${session}: ${total} participants`, 14, summaryY);
    summaryY += 10;
  }

  // Add location summary table
  const summaryData = locationStats.map((location, index) => [
    index + 1,
    location.name,
    location.eventDate,
    location.registrationCount,
    location.maxCapacity,
    location.availableSpots > 0 ? 'Available' : 'Full'
  ]);

  autoTable(doc, {
    head: [['#', 'Location', 'Date', 'Registered', 'Capacity', 'Status']],
    body: summaryData,
    startY: summaryY + 5,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'left',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [236, 198, 127], // D79 golden color
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, // #
      1: { cellWidth: 60 }, // Location
      2: { cellWidth: 40 }, // Date
      3: { cellWidth: 25, halign: 'center' }, // Registered
      4: { cellWidth: 25, halign: 'center' }, // Capacity
      5: { cellWidth: 25, halign: 'center' }, // Status
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'wrap',
  });

  // Add footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
}

export function downloadSummaryPDF(locationStats: LocationStat[]) {
  const doc = generateSummaryPDF(locationStats);
  const fileName = `d79-summary-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
