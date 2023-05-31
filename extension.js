const { Gio, GObject } = imports.gi;
const { PACKAGE_VERSION } = imports.misc.config;

const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;

const BrightnessSlider = GObject.registerClass(
    class BrightnessSlider extends QuickSettings.QuickSlider {
        _init() {
            super._init({
                iconName: 'display-brightness-symbolic',
            });


            this._sliderChangedId = this.slider.connect('notify::value',
                this._onSliderChanged.bind(this));

            this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.screenpad-control');

            this._settings.connect('changed::brightness',
                this._onSettingsChanged.bind(this));

            this._onSettingsChanged();

            // Set an accessible name for the slider
            this.slider.accessible_name = 'Brightness';
        }

        _onSettingsChanged() {
            // Prevent the slider from emitting a change signal while being updated
            this.slider.block_signal_handler(this._sliderChangedId);
            this.slider.value = this._settings.get_uint('brightness') / 254.0;
            this.slider.unblock_signal_handler(this._sliderChangedId);
        }

        _onSliderChanged() {
            // Assuming our GSettings holds values between 0..254, adjust for the
            // slider taking values between 0..1

            const sliderValue = this.slider.value;
            const brightnessValue = Math.round(sliderValue * 254);
            this._settings.set_uint('brightness', brightnessValue);
            log("sliderValue: " + sliderValue);
            log("brightnessValue: " + brightnessValue);
            debounced_set_brightness_level(brightnessValue + 1); // +1 to avoid 0 to not let it turn off using slider
        }
    });

const FeatureToggle = GObject.registerClass(
    class FeatureToggle extends QuickSettings.QuickToggle {
        _init() {
            super._init({
                title: 'Toggle Screenpad',
                iconName: 'selection-mode-symbolic',
                toggleMode: true,
                checked: true,
            });

            // Connecting the toggled signal to a callback function
            this.connect('notify::checked', (toggle) => {
                let isChecked = toggle.checked;
                if (isChecked) {
                    debounced_set_brightness_level(255);
                } else {
                    debounced_set_brightness_level(0);
                }
            });

            let brightnessLevel = get_brightness_level();
            log("brightnessLevel: " + brightnessLevel);
            if (brightnessLevel == 0) {
                this.checked = false;
            }
        }
    });



const FeatureIndicator = GObject.registerClass(
    class FeatureIndicator extends QuickSettings.SystemIndicator {
        _init() {
            super._init();

            this.quickSettingsItems.push(new FeatureToggle());
            this.quickSettingsItems.push(new BrightnessSlider());

            this.connect('destroy', () => {
                this.quickSettingsItems.forEach(item => item.destroy());
            });

            QuickSettingsMenu._addItems(this.quickSettingsItems);
        }
    });

// Define a debounce function that takes a function and a delay as arguments
function debounce(func, delay) {
    // Initialize a variable to store the timeout ID
    let timeoutID = null;

    // Return a wrapper function that takes the same arguments as the original function
    return function (...args) {
        // Clear any previous timeout if it exists
        if (timeoutID) {
            GLib.source_remove(timeoutID);
        }

        // Set a new timeout that will call the original function after the delay
        timeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            // Call the original function with the arguments
            func(...args);

            // Reset the timeout ID to null
            timeoutID = null;

            // Stop the timeout
            return GLib.SOURCE_REMOVE;
        });
    };
}

// Create a debounced version of the set_brightness_level function
// This will delay invoking the function until after 100 milliseconds have elapsed since the last time it was invoked
const debounced_set_brightness_level = debounce(set_brightness_level, 100);

let BRIGHTNESS_FILE = "/sys/class/leds/asus::screenpad/brightness";

function set_brightness_level(value) {
    // Try to write the value to the file using a shell command and return 0
    try {
        // Use GLib.spawn_async_with_pipes to execute the command asynchronously and get the output and error streams
        let commandToggle = `echo ${value} | tee ${BRIGHTNESS_FILE}`;
        let [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
            null, // working directory
            ["/bin/sh", "-c", commandToggle], // command arguments
            null, // environment variables
            GLib.SpawnFlags.DO_NOT_REAP_CHILD, // flags
            null // child setup function
        );

        // Check if the command was successful
        if (success) {
            log("Command executed successfully");
            // Create data input streams for reading the output and error streams
            let stdout = new Gio.DataInputStream({ base_stream: new Gio.UnixInputStream({ fd: stdout_fd }) });
            let stderr = new Gio.DataInputStream({ base_stream: new Gio.UnixInputStream({ fd: stderr_fd }) });

            // Read the output and error streams until EOF
            let out = "";
            let err = "";
            let [line, size] = [null, 0];
            while (([line, size] = stdout.read_line(null)) != null && line != null) {
                out += line + "\n";
            }
            while (([line, size] = stderr.read_line(null)) != null && line != null) {
                err += line + "\n";
            }

            // Close the streams
            stdout.close(null);
            stderr.close(null);

            // Add a child watch callback that will be called when the command exits
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, status) => {
                // Get the exit code of the command
                let exit_code = GLib.spawn_check_exit_status(status);

                // Check if the command exited normally
                if (exit_code == 0) {
                    // Add a delay of 100 milliseconds after executing the command
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        console.log("Command executed successfully");
                        return GLib.SOURCE_REMOVE; // Stop the timeout
                    });
                } else {
                    // If not, show the error message and return -1
                    log("0: Error writing to file: ", err);
                    return -1;
                }

                // Reap the child process to avoid zombie processes
                GLib.spawn_close_pid(pid);
            });

            return 0;
        } else {
            // If not, show the file open error and return -1
            log("1: Error writing to file: ", err);
            return -1;
        }
    } catch (err) {
        // If there is an error, show the file open error and return -1
        log("2: Error writing to file: ", err);
        return -1;
    }
}

function get_brightness_level() {
    // Try to read the value from the file using a shell command and return it
    try {
        // Use GLib.spawn_sync to execute the command synchronously and get the output and error strings
        let commandRead = `cat ${BRIGHTNESS_FILE}`;
        let [success, stdout, stderr, exit_code] = GLib.spawn_sync(
            null, // working directory
            ["/bin/sh", "-c", commandRead], // command arguments
            null, // environment variables
            GLib.SpawnFlags.DEFAULT, // flags
            null // child setup function
        );

        // Check if the command was successful and exited normally
        if (success && exit_code == 0) {
            log("Command executed successfully");
            // Parse the output string as a number and return it
            let brightness = parseInt(stdout);
            return brightness;
        } else {
            // If not, show the error message and return -1
            log("Error reading from file: ", stderr);
            return -1;
        }
    } catch (err) {
        // If there is an error, show the error message and return -1
        log("Error reading from file: ", err);
        return -1;
    }
}


class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        this._indicator = null;
    }

    enable() {
        this._indicator = new FeatureIndicator();
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
