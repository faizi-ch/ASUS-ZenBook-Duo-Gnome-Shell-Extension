VERSION = 1

EXTENSION_INSTALL_DIR = "$(HOME)/.local/share/gnome-shell/extensions/screenpad-control@faizan"

FILES += extension.js
FILES += metadata.json
FILES += schemas/gschemas.compiled
FILES += schemas/org.gnome.shell.extensions.screenpad-control.gschema.xml

build:
	echo Compiling schemas...
	glib-compile-schemas schemas

clean:
	rm -rf schemas/gschemas.compiled target

package: build
	rm -rf target
	mkdir -p target
	zip target/screenpad-control-v$(VERSION).zip $(FILES)

install: package
	rm -rf $(EXTENSION_INSTALL_DIR)
	mkdir -p "$(EXTENSION_INSTALL_DIR)"
	unzip -o target/screenpad-control-v$(VERSION).zip -d "$(EXTENSION_INSTALL_DIR)"