using Microsoft.Extensions.Logging;
using Uno.Extensions;
using Uno.UI;
using Windows.UI.Xaml;

namespace FlappyBird.Wasm
{
	public class Program
	{
		private static App _app;

		static int Main(string[] args)
		{
			FeatureConfiguration.UIElement.AssignDOMXamlName = true;

			Application.Start(_ => _app = new App());

			return 0;
		}
	}
}
