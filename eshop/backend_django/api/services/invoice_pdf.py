from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)


class NumberedCanvasMixin:
    pass


def _money(value, currency):
    return f"{currency} {value:,.2f}"


def render_invoice_pdf(invoice):
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Right", parent=styles["BodyText"], alignment=TA_RIGHT))
    doc = BaseDocTemplate(
        buffer, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=15 * mm, bottomMargin=18 * mm,
        title=f"SmartWear {invoice.invoice_number}",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")

    def footer(canvas, current_doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#dddddd"))
        canvas.line(doc.leftMargin, 12 * mm, A4[0] - doc.rightMargin, 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#666666"))
        canvas.drawString(doc.leftMargin, 7 * mm, f"{invoice.company_name_snapshot} · Thank you")
        canvas.drawRightString(A4[0] - doc.rightMargin, 7 * mm, f"Page {current_doc.page}")
        canvas.restoreState()

    doc.addPageTemplates(PageTemplate(id="invoice", frames=frame, onPage=footer))
    title = "PRO FORMA INVOICE" if invoice.document_type == invoice.DocumentType.PROFORMA else "INVOICE"
    story = [
        Table([
            [Paragraph(f"<b>{invoice.company_name_snapshot}</b>", styles["Title"]),
             Paragraph(f"<b>{title}</b><br/>{invoice.invoice_number}", styles["Right"])],
        ], colWidths=[doc.width * .55, doc.width * .45]),
        Spacer(1, 8 * mm),
        Table([
            [Paragraph("<b>BILL TO</b>", styles["BodyText"]), Paragraph("<b>DOCUMENT</b>", styles["Right"])],
            [Paragraph(
                "<br/>".join(filter(None, [
                    invoice.customer_name_snapshot, invoice.customer_email_snapshot,
                    invoice.customer_phone_snapshot, invoice.customer_address_snapshot,
                ])), styles["BodyText"]),
             Paragraph(
                 f"Issued: {invoice.issued_at:%d %b %Y}<br/>Status: {invoice.get_status_display()}",
                 styles["Right"],
             )],
        ], colWidths=[doc.width * .6, doc.width * .4]),
        Spacer(1, 8 * mm),
    ]
    rows = [["Item", "Qty", "Unit price", "Discount", "Total"]]
    for item in invoice.items.all():
        specs = ", ".join(
            f"{entry.get('group_name') or entry.get('name', '')}: {entry.get('option_value') or entry.get('value', '')}"
            for entry in (item.selected_specifications_snapshot or [])
        )
        label = f"<b>{item.product_name_snapshot}</b>"
        if item.product_sku_snapshot:
            label += f"<br/><font size=8>SKU {item.product_sku_snapshot}</font>"
        if item.trader_name_snapshot:
            label += f"<br/><font size=8>{item.trader_name_snapshot}</font>"
        if specs:
            label += f"<br/><font size=8>{specs}</font>"
        rows.append([
            Paragraph(label, styles["BodyText"]), str(item.quantity),
            _money(item.unit_price, invoice.currency),
            _money(item.line_discount, invoice.currency),
            _money(item.line_total, invoice.currency),
        ])
    table = Table(rows, repeatRows=1, colWidths=[75 * mm, 13 * mm, 31 * mm, 27 * mm, 32 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), .3, colors.HexColor("#dddddd")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f7f7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([table, Spacer(1, 6 * mm)])
    totals = [
        ["Subtotal", _money(invoice.subtotal_amount, invoice.currency)],
        ["Discount", _money(invoice.discount_amount, invoice.currency)],
        ["Delivery", _money(invoice.delivery_fee, invoice.currency)],
        [Paragraph("<b>TOTAL</b>", styles["BodyText"]),
         Paragraph(f"<b>{_money(invoice.total_amount, invoice.currency)}</b>", styles["Right"])],
    ]
    totals_table = Table(totals, colWidths=[35 * mm, 43 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(totals_table)
    doc.build(story)
    return buffer.getvalue()

