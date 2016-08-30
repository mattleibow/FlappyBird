using System;
using SkiaSharp;
using Windows.UI.Xaml.Controls;
using Windows.Graphics.Display;
using System.Runtime.InteropServices;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Media.Imaging;
using System.Runtime.InteropServices.WindowsRuntime;
using System.IO;
using Windows.UI.Xaml.Media;

namespace FlappyBird.UWP
{
    public abstract class SkiaControl : Canvas
    {
        private byte[] pixels;
        private GCHandle buff;
        private WriteableBitmap bitmap;

        public SkiaControl()
        {
            SizeChanged += OnSizeChanged;
            Tapped += OnTapped;
            Unloaded += OnUnloaded;
        }

        public int PixelWidth => (int)ActualWidth;

        public int PixelHeight => (int)ActualHeight;

        protected abstract void OnDraw(SKCanvas canvas);

        protected virtual void OnSizeChanged(object sender, SizeChangedEventArgs e)
        {
            Invalidate();
        }

        protected virtual void OnTapped(object sender, TappedRoutedEventArgs e)
        {
        }

        private void OnUnloaded(object sender, RoutedEventArgs e)
        {
            FreeBitmap();
        }

        public void Invalidate()
        {
            CreateBitmap();
            using (var surface = SKSurface.Create(PixelWidth, PixelHeight, SKImageInfo.PlatformColorType, SKAlphaType.Premul, buff.AddrOfPinnedObject(), PixelWidth * 4))
            {
                OnDraw(surface.Canvas);
            }

            var stream = bitmap.PixelBuffer.AsStream();
            stream.Seek(0, SeekOrigin.Begin);
            stream.Write(pixels, 0, pixels.Length);

            bitmap.Invalidate();
        }

        private void CreateBitmap()
        {
            if (bitmap == null || bitmap.PixelWidth != PixelWidth || bitmap.PixelHeight != PixelHeight)
            {
                FreeBitmap();

                bitmap = new WriteableBitmap(PixelWidth, PixelHeight);
                pixels = new byte[bitmap.PixelWidth * bitmap.PixelHeight * 4];
                buff = GCHandle.Alloc(pixels, GCHandleType.Pinned);

                Background = new ImageBrush
                {
                    ImageSource = bitmap,
                    AlignmentX = AlignmentX.Left,
                    AlignmentY = AlignmentY.Top,
                    Stretch = Stretch.None
                };
            }
        }

        private void FreeBitmap()
        {
            if (bitmap != null)
            {
                bitmap = null;
            }
            if (buff.IsAllocated)
            {
                buff.Free();
                buff = default(GCHandle);
            }
            pixels = null;
        }
    }
}
