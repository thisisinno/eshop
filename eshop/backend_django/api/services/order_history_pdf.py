from io import BytesIO
from xml.sax.saxutils import escape

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.models import SiteBranding
from api.serializers.orders import build_order_journey
from api.services.pdf_assets import PDFImageLoader


def _money(value, currency):
    return f"{currency} {value:,.2f}"


def render_order_history_pdf(user, orders):
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="SmallMuted", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#555555"), leading=11))
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=15 * mm, bottomMargin=16 * mm,
        title="SmartWear order history",
        pageCompression=0,
    )
    loader = PDFImageLoader()
    branding = SiteBranding.objects.order_by("-updated_at").first()
    logo_stream = loader.load("", branding.logo if branding and branding.logo else None, (600, 240))
    logo = Image(logo_stream, width=34 * mm, height=14 * mm, kind="proportional") if logo_stream else None
    customer_name = user.get_full_name() or user.get_username()
    story = [
        Table([[logo or Paragraph("<b>SmartWear</b>", styles["Title"]),
                Paragraph("<b>ORDER HISTORY</b>", styles["Heading2"])]],
              colWidths=[doc.width * .58, doc.width * .42]),
        Spacer(1, 5 * mm),
        Paragraph(f"<b>Customer:</b> {escape(customer_name)}<br/><b>Email:</b> {escape(user.email or '')}<br/><b>Generated:</b> {timezone.localtime():%d %b %Y, %H:%M %Z}", styles["BodyText"]),
        Spacer(1, 6 * mm),
    ]
    orders = list(orders)
    if not orders:
        story.append(Paragraph("No orders exist for this account.", styles["BodyText"]))
    for order_index, order in enumerate(orders):
        if order_index:
            story.append(PageBreak())
        story.extend([
            Paragraph(f"<b>{escape(order.order_number)}</b>", styles["Heading2"]),
            Paragraph(
                f"{order.created_at:%d %b %Y, %H:%M} · Order {escape(order.get_status_display())} · Payment {escape(order.get_payment_status_display())}",
                styles["SmallMuted"],
            ),
            Spacer(1, 3 * mm),
        ])
        item_rows = [["Image", "Product", "Qty", "Unit price", "Discount", "Total"]]
        for item in order.items.all():
            primary = item.product.primary_media if item.product_id else None
            stream = loader.load(item.product_media_url, primary.file if primary and primary.file else None, (500, 500))
            thumbnail = Image(stream, width=15 * mm, height=15 * mm, kind="proportional") if stream else "—"
            specs = ", ".join(
                f"{entry.get('group_name') or entry.get('name', '')}: {entry.get('option_value') or entry.get('value', '')}"
                for entry in (item.selected_specifications_snapshot or [])
            )
            product_text = f"<b>{escape(item.product_name_snapshot)}</b>"
            if specs:
                product_text += f"<br/><font size=7>{escape(specs)}</font>"
            item_rows.append([
                thumbnail, Paragraph(product_text, styles["BodyText"]), str(item.quantity),
                _money(item.unit_price, order.currency), _money(item.line_discount, order.currency),
                _money(item.line_total, order.currency),
            ])
        items_table = Table(item_rows, repeatRows=1, colWidths=[18 * mm, 58 * mm, 11 * mm, 29 * mm, 27 * mm, 35 * mm])
        items_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.black), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), .3, colors.HexColor("#dddddd")), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"), ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.extend([
            items_table, Spacer(1, 3 * mm),
            Paragraph(
                f"<b>Subtotal:</b> {_money(order.subtotal_amount, order.currency)} · "
                f"<b>Discount:</b> {_money(order.discount_amount, order.currency)} · "
                f"<b>Delivery:</b> {_money(order.delivery_fee, order.currency)} · "
                f"<b>Total:</b> {_money(order.total_amount, order.currency)}",
                styles["BodyText"],
            ),
            Spacer(1, 3 * mm),
            Paragraph(f"<b>Delivery address:</b> {escape(order.customer_address or ', '.join(filter(None, [order.customer_region, order.customer_district, order.customer_ward, order.customer_street])) or 'Not provided')}", styles["BodyText"]),
            Spacer(1, 4 * mm),
            Paragraph("<b>Order journey and conversation</b>", styles["Heading3"]),
        ])
        for event in build_order_journey(order):
            actor = f" · {escape(event['actor_name'])} ({escape(event['actor_role'] or 'system')})" if event["actor_name"] else ""
            story.append(Paragraph(
                f"<b>{event['created_at']:%d %b %Y, %H:%M} — {escape(event['title'])}</b>{actor}<br/>{escape(event['description'])}",
                styles["SmallMuted"],
            ))
            story.append(Spacer(1, 1.5 * mm))
    doc.build(story)
    return buffer.getvalue()
