# ASUS ZenBook Duo Gnome Shell Extension

This GNOME Shell extension adds functionality to control the screenpad on ASUS ZenBook Duo notebooks. It provides a toggle to turn the screenpad on/off and a slider to adjust the brightness in the QuickSettings of the GNOME desktop environment.

<div align="center">
  <img src="https://github.com/faizi-ch/ASUS-ZenBook-Duo-Gnome-Shell-Extension/assets/33290441/e83f11f9-39c9-4420-8043-3e6a2b7e9ab1" alt="Extension Screenshot" width="35%">
</div>

## Prerequisites

Before installing the extension, you need to perform the following steps:

1. Build and install the asus-wmi module for controlling the screenpad. Follow the instructions in the [asus-wmi-screenpad](https://github.com/Plippo/asus-wmi-screenpad) repository to build and install the kernel module.

2. If you didn't already set the permissions, create a udev rule to set the permissions for the screenpad backlight brightness. Open a terminal and run the following command to create the udev rule file:

   ```shell
   sudo nano /etc/udev/rules.d/99-asus.rules
   ```

   Add the following line to the file:

   ```shell
   # rules for asus_nb_wmi devices

   # make screenpad backlight brightness write-able by everyone
   ACTION=="add", SUBSYSTEM=="leds", KERNEL=="asus::screenpad", RUN+="/bin/chmod a+w /sys/class/leds/%k/brightness"
   ```

   Save the file and exit the text editor.

3. Test if the screenpad brightness can be set by executing the following command in the terminal:

   ```shell
   echo XXX > '/sys/class/leds/asus::screenpad/brightness'
   ```

   Replace `XXX` with a value between 0 and 255 (0 turns the screen completely off, 255 sets it to maximum brightness). If the brightness is set successfully, you can proceed with installing the extension.

## Installation

To install the ASUS ZenBook Duo Gnome Shell Extension, follow these steps:

1. Clone the repository:

   ```shell
   git clone https://github.com/faizi-ch/ASUS-ZenBook-Duo-Gnome-Shell-Extension.git
   ```

2. Change to the extension directory:

   ```shell
   cd ASUS-ZenBook-Duo-Gnome-Shell-Extension
   ```

3. Install the extension:

   ```shell
   make install
   ```

   This command will build and install the extension.

## Usage

After installing the extension, you can log out and log back in for the changes to take effect. Once logged in, you will see the controls for the screenpad in the quicksettings of the GNOME Shell.

## License

This extension is licensed under the GNU General Public License. For more details, see the [LICENSE](LICENSE) file.

```
