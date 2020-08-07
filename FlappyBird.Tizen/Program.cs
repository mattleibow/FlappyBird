using Xamarin.Forms;
using Xamarin.Forms.Platform.Tizen;

namespace FlappyBird
{
	public class Program : FormsApplication
	{
		protected override void OnCreate()
		{
			base.OnCreate();
			MainWindow.IndicatorMode = ElmSharp.IndicatorMode.Hide;
			LoadApplication(new App());
		}

		public static void Main(string[] args)
		{
			var app = new Program();
			Forms.Init(app, true);
			app.Run(args);
		}
	}
}
