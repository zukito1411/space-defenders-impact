package com.zukito.spaceimpactdefender;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "GameAssets")
public final class GameAssetsPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean();
    private volatile boolean closed;

    private GameAssetStore store() {
        return ((MainActivity) getActivity()).gameAssets;
    }

    @PluginMethod
    public void status(PluginCall call) {
        worker.execute(() -> {
            try {
                call.resolve(store().status());
            } catch (Exception error) {
                call.reject("Could not check game files.", error);
            }
        });
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        if (!downloading.compareAndSet(false, true)) {
            call.reject("A download is already running.");
            return;
        }
        worker.execute(() -> {
            Exception failure = null;
            try {
                store().install((done, total, message) -> {
                    if (closed) return;
                    JSObject progress = new JSObject();
                    progress.put("done", done);
                    progress.put("total", total);
                    progress.put("message", message);
                    notifyListeners("progress", progress);
                });
            } catch (Exception error) {
                failure = error;
            } finally {
                downloading.set(false);
            }
            if (closed) return;
            if (failure == null) call.resolve();
            else call.reject("Could not finish downloading game files. " + failure.getMessage(), failure);
        });
    }

    @Override
    protected void handleOnDestroy() {
        closed = true;
        worker.shutdownNow();
        super.handleOnDestroy();
    }
}
