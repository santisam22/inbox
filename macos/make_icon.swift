// Draws the Inbox app icon (1024×1024 PNG). Usage: swift make_icon.swift out.png
import AppKit

let size: CGFloat = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

// macOS icon grid: ~824pt rounded square centered in 1024.
let tile = NSRect(x: 100, y: 100, width: 824, height: 824)
let tilePath = NSBezierPath(roundedRect: tile, xRadius: 185, yRadius: 185)
NSGraphicsContext.current?.saveGraphicsState()
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.28)
shadow.shadowOffset = NSSize(width: 0, height: -12)
shadow.shadowBlurRadius = 28
shadow.set()
NSColor(red: 0.10, green: 0.36, blue: 0.86, alpha: 1).setFill()
tilePath.fill()
NSGraphicsContext.current?.restoreGraphicsState()
NSGradient(starting: NSColor(red: 0.30, green: 0.62, blue: 1.0, alpha: 1),
           ending: NSColor(red: 0.04, green: 0.30, blue: 0.82, alpha: 1))!.draw(in: tilePath, angle: -90)

// Envelope
let env = NSRect(x: 262, y: 318, width: 500, height: 370)
let body = NSBezierPath(roundedRect: env, xRadius: 46, yRadius: 46)
NSColor.white.setFill()
body.fill()
let flap = NSBezierPath()
flap.move(to: NSPoint(x: env.minX + 40, y: env.maxY - 34))
flap.line(to: NSPoint(x: env.midX, y: env.minY + 150))
flap.line(to: NSPoint(x: env.maxX - 40, y: env.maxY - 34))
flap.lineWidth = 34
flap.lineCapStyle = .round
flap.lineJoinStyle = .round
NSColor(red: 0.10, green: 0.40, blue: 0.90, alpha: 1).setStroke()
flap.stroke()

image.unlockFocus()
let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
