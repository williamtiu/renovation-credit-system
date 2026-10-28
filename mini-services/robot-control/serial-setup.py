#!/usr/bin/env python3
"""Configure a Linux serial port for the R1-7A IM6014 bus, then hand it off.

Used by tty-transport.ts because Bun cannot load serialport's native binding
(uv_poll_init is unsupported), and because 6,000,000 baud is not a standard
termios speed — `stty` rejects it. pyserial reaches it through the FTDI custom
divisor (ASYNC_SPD_CUST), which is exactly how the ROS arm_bridge runs today.

This script only *configures* the port. It opens long enough to apply the
settings, closes immediately, and never transmits a byte.

exit 0 = raw + baud configured
exit 2 = raw only (baud not applicable, e.g. a pty) — port is usable
exit 1 = setup failed
"""
import os
import sys
import tty

path = sys.argv[1]
baud = int(sys.argv[2])

try:
    import serial
except ImportError:
    serial = None

if serial is not None:
    try:
        s = serial.Serial()
        s.port = path
        s.baudrate = baud
        # Half-duplex RS485 on the IM6014 bus: no modem flow control, and the
        # control lines stay down so opening never resets the adapter.
        s.rtscts = False
        s.dsrdtr = False
        s.rts = False
        s.dtr = False
        s.timeout = 0.002
        s.write_timeout = 0.5
        s.open()
        applied = s.baudrate
        s.close()
        print(f"configured {path} @ {applied} (pyserial termios + custom divisor), raw")
        sys.exit(0)
    except Exception as exc:
        primary = exc
    else:
        primary = None
else:
    primary = RuntimeError("pyserial not importable")

# Fall back to raw-only. A pty has no baud concept at all, so this is the
# normal path for the virtual-bus test harness.
try:
    fd = os.open(path, os.O_RDONLY | os.O_NOCTTY)
    try:
        tty.setraw(fd)
    finally:
        os.close(fd)
    print(f"raw-only on {path}; baud {baud} not applied ({primary})")
    sys.exit(2)
except Exception as exc:
    print(f"serial setup failed for {path}: {primary}; fallback failed: {exc}")
    sys.exit(1)
