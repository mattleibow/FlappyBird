using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Windows.Forms;
using SkiaSharp;

namespace FlappyBird.Desktop
{
    public abstract class SkiaControl : Control
    {
        private Bitmap bitmap;

        public SkiaControl()
        {
            DoubleBuffered = true;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);

            if (DesignMode)
            {
                return;
            }

            CreateBitmap();
            var data = bitmap.LockBits(new Rectangle(0, 0, Width, Height), ImageLockMode.WriteOnly, bitmap.PixelFormat);

            using (var surface = SKSurface.Create(Width, Height, SKImageInfo.PlatformColorType, SKAlphaType.Premul, data.Scan0, data.Stride))
            {
                OnDraw(surface.Canvas);
            }

            bitmap.UnlockBits(data);

            e.Graphics.DrawImage(bitmap, 0, 0);
        }

        protected abstract void OnDraw(SKCanvas canvas);

        protected override void OnClientSizeChanged(EventArgs e)
        {
            base.OnClientSizeChanged(e);
            Invalidate();
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);

            FreeBitmap();
        }

        private void CreateBitmap()
        {
            if (bitmap == null || bitmap.Width != Width || bitmap.Height != Height)
            {
                FreeBitmap();

                bitmap = new Bitmap(Width, Height, PixelFormat.Format32bppPArgb);
            }
        }

        private void FreeBitmap()
        {
            if (bitmap != null)
            {
                bitmap.Dispose();
                bitmap = null;
            }
        }
    }
}
