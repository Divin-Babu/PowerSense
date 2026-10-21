import io
from datetime import datetime
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count on footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header border line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        
        # Running Top Header
        self.line(40, 802, 555, 802)
        self.drawString(40, 807, "PowerSense AI — Intelligent Energy & Electrical Telemetry Report")
        
        # Running Bottom Footer
        self.line(40, 45, 555, 45)
        self.drawString(40, 32, "Confidential & Automated Energy Analytics Report • PowerSense AI System")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 32, page_text)
        self.restoreState()


class PowerSensePDFReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        primary_color = colors.HexColor("#00C48C")
        dark_text = colors.HexColor("#0F172A")

        self.styles.add(ParagraphStyle(
            'ReportTitle',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=dark_text,
            spaceAfter=4
        ))

        self.styles.add(ParagraphStyle(
            'ReportSubtitle',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=12
        ))

        self.styles.add(ParagraphStyle(
            'SectionHeader',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=12,
            spaceAfter=8
        ))

        self.styles.add(ParagraphStyle(
            'MetaLabel',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569")
        ))

        self.styles.add(ParagraphStyle(
            'MetaValue',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#0F172A")
        ))

        self.styles.add(ParagraphStyle(
            'TableCellBold',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#0F172A")
        ))

        self.styles.add(ParagraphStyle(
            'TableCell',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155")
        ))

        self.styles.add(ParagraphStyle(
            'BadgeText',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white
        ))

    def generate_report(
        self,
        user_info: Dict[str, Any],
        period_info: Dict[str, Any],
        metrics: Dict[str, Any],
        readings: List[Dict[str, Any]],
        appliances: List[Dict[str, Any]],
        anomalies: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]]
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=40,
            rightMargin=40,
            topMargin=50,
            bottomMargin=55
        )

        story = []

        # 1. Header Banner Block
        header_data = [
            [
                Paragraph("<b>POWERSENSE AI</b><br/><font color='#64748B' size=8>Energy Command Center</font>", self.styles['ReportTitle']),
                Paragraph(f"<b>USAGE REPORT</b><br/><font color='#00C48C' size=9>ID: REP-{datetime.utcnow().strftime('%Y%m%d%H%M')}</font>", ParagraphStyle('RightHeader', parent=self.styles['MetaValue'], alignment=2))
            ]
        ]
        header_table = Table(header_data, colWidths=[320, 195])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#00C48C"), spaceBefore=2, spaceAfter=14))

        # 2. Metadata Box (User Profile, Device, Date Range)
        meta_table_data = [
            [
                Paragraph("<b>User Account:</b>", self.styles['MetaLabel']),
                Paragraph(user_info.get("name", "Demo Resident"), self.styles['MetaValue']),
                Paragraph("<b>Report Period:</b>", self.styles['MetaLabel']),
                Paragraph(period_info.get("label", "Last 24 Hours"), self.styles['MetaValue']),
            ],
            [
                Paragraph("<b>Email Address:</b>", self.styles['MetaLabel']),
                Paragraph(user_info.get("email", "user@powersense.com"), self.styles['MetaValue']),
                Paragraph("<b>Primary Hardware:</b>", self.styles['MetaLabel']),
                Paragraph(period_info.get("device", "ESP32-PZEM-PLUG-10A"), self.styles['MetaValue']),
            ],
            [
                Paragraph("<b>Generated On:</b>", self.styles['MetaLabel']),
                Paragraph(datetime.now().strftime("%d %b %Y, %H:%M:%S IST"), self.styles['MetaValue']),
                Paragraph("<b>Tariff Rate:</b>", self.styles['MetaLabel']),
                Paragraph(f"₹ {metrics.get('tariff_rate', 6.50):.2f} / kWh", self.styles['MetaValue']),
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[100, 160, 100, 155])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # 3. Key Metrics Executive Summary Grid
        story.append(Paragraph("Executive Energy Metrics Overview", self.styles['SectionHeader']))
        
        kwh_val = f"{metrics.get('total_kwh', 0.0):.2f} kWh"
        bill_val = f"₹ {metrics.get('estimated_bill', 0.0):.2f}"
        peak_val = f"{metrics.get('peak_watts', 0):.0f} W"
        avg_v = f"{metrics.get('avg_voltage', 230.0):.1f} V"
        avg_i = f"{metrics.get('avg_current', 0.0):.2f} A"
        pf_val = f"{metrics.get('avg_pf', 0.98):.2f} cos φ"

        metrics_grid = [
            [
                Paragraph("TOTAL ENERGY CONSUMED", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
                Paragraph("ESTIMATED BILL COST", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
                Paragraph("PEAK ACTIVE LOAD", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
            ],
            [
                Paragraph(f"<b><font size=14 color='#00C48C'>{kwh_val}</font></b>", self.styles['TableCellBold']),
                Paragraph(f"<b><font size=14 color='#0F172A'>{bill_val}</font></b>", self.styles['TableCellBold']),
                Paragraph(f"<b><font size=14 color='#F59E0B'>{peak_val}</font></b>", self.styles['TableCellBold']),
            ],
            [
                Paragraph("AVG LINE VOLTAGE", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
                Paragraph("AVG CURRENT DRAW", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
                Paragraph("AVERAGE POWER FACTOR", ParagraphStyle('SubHeader', parent=self.styles['MetaLabel'], fontSize=7, textColor=colors.HexColor("#64748B"))),
            ],
            [
                Paragraph(f"<b><font size=12 color='#38BDF8'>{avg_v}</font></b>", self.styles['TableCellBold']),
                Paragraph(f"<b><font size=12 color='#6366F1'>{avg_i}</font></b>", self.styles['TableCellBold']),
                Paragraph(f"<b><font size=12 color='#10B981'>{pf_val}</font></b>", self.styles['TableCellBold']),
            ]
        ]
        metrics_table = Table(metrics_grid, colWidths=[171, 171, 173])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('BOTTOMPADDING', (0,0), (-1,0), 2),
            ('TOPPADDING', (0,1), (-1,1), 2),
            ('BOTTOMPADDING', (0,1), (-1,1), 6),
            ('TOPPADDING', (0,2), (-1,2), 6),
            ('BOTTOMPADDING', (0,2), (-1,2), 2),
            ('TOPPADDING', (0,3), (-1,3), 2),
            ('BOTTOMPADDING', (0,3), (-1,3), 6),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 14))

        # 4. Appliance & Load Category Breakdown Table
        story.append(Paragraph("Appliance Load Breakdown & Category Stats", self.styles['SectionHeader']))
        
        hdr_style = ParagraphStyle('HdrStyle', parent=self.styles['TableCellBold'], textColor=colors.white)
        app_rows = [
            [
                Paragraph("Appliance / Load Name", hdr_style),
                Paragraph("Category", hdr_style),
                Paragraph("Active Power (W)", hdr_style),
                Paragraph("Standby (W)", hdr_style),
                Paragraph("Est. Daily kWh", hdr_style),
            ]
        ]
        if appliances:
            for app in appliances:
                app_rows.append([
                    Paragraph(app.get("name", "Unknown Appliance"), self.styles['TableCellBold']),
                    Paragraph(app.get("category", "General Load"), self.styles['TableCell']),
                    Paragraph(f"{app.get('power_rating', 0):.0f} W", self.styles['TableCell']),
                    Paragraph(f"{app.get('standby_power', 0):.1f} W", self.styles['TableCell']),
                    Paragraph(f"{app.get('daily_kwh', 0.0):.2f} kWh", self.styles['TableCellBold']),
                ])
        else:
            default_apps = [
                ("Active Load (Air Conditioner / Heater)", "HVAC / Thermal", 1450, 5.0, 3.20),
                ("Continuous Run (Refrigerator / Server)", "Refrigeration", 180, 2.5, 1.45),
                ("Standby / Idle Electronics", "Entertainment & IT", 45, 8.0, 0.35),
            ]
            for name, cat, pwr, stby, kwh in default_apps:
                app_rows.append([
                    Paragraph(name, self.styles['TableCellBold']),
                    Paragraph(cat, self.styles['TableCell']),
                    Paragraph(f"{pwr} W", self.styles['TableCell']),
                    Paragraph(f"{stby} W", self.styles['TableCell']),
                    Paragraph(f"{kwh:.2f} kWh", self.styles['TableCellBold']),
                ])

        app_table = Table(app_rows, colWidths=[160, 115, 80, 80, 80])
        app_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(app_table)
        story.append(Spacer(1, 14))

        # 5. Energy Reading Telemetry History Table
        story.append(Paragraph("PZEM-004T High-Precision Telemetry Sample Logs", self.styles['SectionHeader']))
        readings_rows = [
            [
                Paragraph("Timestamp", hdr_style),
                Paragraph("Voltage (V)", hdr_style),
                Paragraph("Current (A)", hdr_style),
                Paragraph("Power (W)", hdr_style),
                Paragraph("Power Factor", hdr_style),
                Paragraph("Energy (kWh)", hdr_style),
            ]
        ]
        if readings:
            for r in readings[:15]:
                readings_rows.append([
                    Paragraph(str(r.get("timestamp", "-")), self.styles['TableCell']),
                    Paragraph(f"{float(r.get('voltage', 230.0)):.1f}", self.styles['TableCell']),
                    Paragraph(f"{float(r.get('current', 0.0)):.2f}", self.styles['TableCell']),
                    Paragraph(f"{float(r.get('power', 0.0)):.1f}", self.styles['TableCellBold']),
                    Paragraph(f"{float(r.get('power_factor', 0.98)):.2f}", self.styles['TableCell']),
                    Paragraph(f"{float(r.get('energy', 0.0)):.3f}", self.styles['TableCell']),
                ])
        else:
            sample_times = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"]
            for st in sample_times:
                readings_rows.append([
                    Paragraph(f"Today {st}", self.styles['TableCell']),
                    Paragraph("230.4 V", self.styles['TableCell']),
                    Paragraph("1.62 A", self.styles['TableCell']),
                    Paragraph("215.0 W", self.styles['TableCellBold']),
                    Paragraph("0.98", self.styles['TableCell']),
                    Paragraph("0.250 kWh", self.styles['TableCell']),
                ])

        readings_table = Table(readings_rows, colWidths=[115, 80, 80, 80, 80, 80])
        readings_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(readings_table)
        story.append(Spacer(1, 14))

        # 6. Flagged Anomalies & AI Recommendations
        anomaly_story = []
        anomaly_story.append(Paragraph("Flagged Anomalies & AI Energy Recommendations", self.styles['SectionHeader']))

        if anomalies:
            for anom in anomalies[:3]:
                anomaly_story.append(Paragraph(
                    f"⚠️ <b>Anomaly Detected:</b> {anom.get('type', 'Power Spike')} — {anom.get('description', 'Unusual surge in electrical draw.')} "
                    f"<font color='#DC2626' size=8>[Severity: {anom.get('severity', 'HIGH')}]</font>",
                    self.styles['TableCellBold']
                ))
        else:
            anomaly_story.append(Paragraph(
                "✔ <b>No Severe Anomalies Detected:</b> Voltage and current parameters remained within safe operating limits during this reporting window.",
                self.styles['TableCell']
            ))

        anomaly_story.append(Spacer(1, 6))

        if recommendations:
            for rec in recommendations[:3]:
                anomaly_story.append(Paragraph(
                    f"💡 <b>AI Energy Tip:</b> {rec.get('title', 'Optimization Opportunity')} — {rec.get('description', 'Shift non-essential loads off-peak to save up to 15% on monthly bill.')}",
                    self.styles['TableCell']
                ))
        else:
            anomaly_story.append(Paragraph(
                "💡 <b>AI Recommendation:</b> Enable Automated Peak-Load Shedding mode on your PowerSense Smart Plug to minimize standby power loss during night hours.",
                self.styles['TableCell']
            ))

        story.append(KeepTogether(anomaly_story))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

pdf_report_generator = PowerSensePDFReportGenerator()
