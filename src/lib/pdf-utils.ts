import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  eventDate: string;
  registrationCount: number;
  maxCapacity: number;
  availableSpots: number;
  registrations: Registration[];
}

export function generateParticipantsPDF(locationStats: LocationStat[], eventType: 'tuesday' | 'thursday' | 'all') {
  const doc = new jsPDF();
  
  // Filter locations based on event type
  const filteredLocations = eventType === 'all' 
    ? locationStats 
    : locationStats.filter(location => 
        eventType === 'tuesday' ? location.eventDate === 'tuesday' : location.eventDate === 'thursday'
      );

  // Add header
  doc.setFontSize(20);
  doc.setTextColor(236, 198, 127); // D79 golden color
  doc.text('DISTRICT 79 FALL CRAWLS', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const eventTitle = eventType === 'all' 
    ? 'PARTICIPANT REGISTRATIONS - ALL EVENTS'
    : eventType === 'tuesday' 
    ? 'PARTICIPANT REGISTRATIONS - TUESDAY, OCTOBER 28'
    : 'PARTICIPANT REGISTRATIONS - THURSDAY, OCTOBER 30';
  
  doc.text(eventTitle, 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

  let startY = 50;

  // Generate table for each location
  filteredLocations.forEach((location, locationIndex) => {
    if (location.registrations.length === 0) return;

    // Add location header
    doc.setFontSize(14);
    doc.setTextColor(236, 198, 127);
    doc.text(`${location.name}`, 14, startY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${location.address}`, 14, startY + 5);
    doc.text(`${location.eventDate === 'tuesday' ? 'Tuesday, October 28' : 'Thursday, October 30'} - ${location.registrationCount}/${location.maxCapacity} participants`, 14, startY + 10);

    // Prepare table data
    const tableData = location.registrations.map((reg, index) => [
      index + 1,
      `${reg.firstName} ${reg.lastName}`,
      reg.email,
      reg.phone,
      reg.school,
      new Date(reg.registeredAt).toLocaleDateString()
    ]);

    // Generate table
    doc.autoTable({
      head: [['#', 'Name', 'Email', 'Phone', 'School', 'Registered']],
      body: tableData,
      startY: startY + 15,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [236, 198, 127], // D79 golden color
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      columnStyles: {
        0: { cellWidth: 15 }, // #
        1: { cellWidth: 40 }, // Name
        2: { cellWidth: 50 }, // Email
        3: { cellWidth: 35 }, // Phone
        4: { cellWidth: 45 }, // School
        5: { cellWidth: 25 }, // Registered
      },
      margin: { left: 14, right: 14 },
    });

    // Update startY for next location
    startY = (doc as any).lastAutoTable.finalY + 20;

    // Add page break if needed (except for last location)
    if (locationIndex < filteredLocations.length - 1 && startY > 250) {
      doc.addPage();
      startY = 20;
    }
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
}

export function downloadParticipantsPDF(locationStats: LocationStat[], eventType: 'tuesday' | 'thursday' | 'all') {
  const doc = generateParticipantsPDF(locationStats, eventType);
  const fileName = `d79-participants-${eventType}-${new Date().toISOString().split('T')[0]}.pdf`;
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
  const tuesdayLocations = locationStats.filter(loc => loc.eventDate === 'tuesday');
  const thursdayLocations = locationStats.filter(loc => loc.eventDate === 'thursday');
  const tuesdayTotal = tuesdayLocations.reduce((sum, location) => sum + location.registrationCount, 0);
  const thursdayTotal = thursdayLocations.reduce((sum, location) => sum + location.registrationCount, 0);

  // Add summary statistics
  doc.setFontSize(14);
  doc.setTextColor(236, 198, 127);
  doc.text('SUMMARY STATISTICS', 14, 60);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Registrations: ${totalRegistrations}`, 14, 75);
  doc.text(`Tuesday Event: ${tuesdayTotal} participants`, 14, 85);
  doc.text(`Thursday Event: ${thursdayTotal} participants`, 14, 95);

  // Add location summary table
  const summaryData = locationStats.map((location, index) => [
    index + 1,
    location.name,
    location.eventDate === 'tuesday' ? 'Tuesday, Oct 28' : 'Thursday, Oct 30',
    location.registrationCount,
    location.maxCapacity,
    location.availableSpots > 0 ? 'Available' : 'Full'
  ]);

  doc.autoTable({
    head: [['#', 'Location', 'Date', 'Registered', 'Capacity', 'Status']],
    body: summaryData,
    startY: 110,
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [236, 198, 127], // D79 golden color
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
    columnStyles: {
      0: { cellWidth: 15 }, // #
      1: { cellWidth: 60 }, // Location
      2: { cellWidth: 40 }, // Date
      3: { cellWidth: 25 }, // Registered
      4: { cellWidth: 25 }, // Capacity
      5: { cellWidth: 25 }, // Status
    },
    margin: { left: 14, right: 14 },
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
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
