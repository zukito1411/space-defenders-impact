package com.zukito.spaceimpactdefender;

import android.content.Context;
import android.system.Os;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.JSObject;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

final class GameAssetStore {
    private static final String BASE_URL =
        "https://github.com/zukito1411/space-defenders-impact/releases/download/android-assets-v1/";
    private static final int BUFFER_SIZE = 65536;
    private static final Object INSTALL_LOCK = new Object();

    interface Progress {
        void update(long done, long total, String message);
    }

    private final File directory;
    private final Map<String, String> paths = new HashMap<>();
    private final Map<String, Long> sizes = new HashMap<>();
    private final JSONArray packs;

    GameAssetStore(Context context) {
        directory = new File(context.getNoBackupFilesDir(), "game-assets-v1");
        try {
            JSONObject manifest = readManifest(context);
            if (manifest == null) {
                packs = new JSONArray();
                return;
            }
            if (manifest.getInt("version") != 1 || !BASE_URL.equals(manifest.getString("baseUrl"))) {
                throw new IOException("Unsupported asset manifest");
            }
            JSONObject files = manifest.getJSONObject("files");
            for (Iterator<String> it = files.keys(); it.hasNext();) {
                String path = it.next();
                JSONObject file = files.getJSONObject(path);
                String hash = file.getString("hash");
                long bytes = file.getLong("bytes");
                if (!(path.startsWith("assets/") || path.startsWith("audio/")) || bytes <= 0 || !validHash(hash)) {
                    throw new IOException("Invalid media entry");
                }
                paths.put(path, hash);
                sizes.put(hash, bytes);
            }
            packs = manifest.getJSONArray("packs");
            Set<String> unassigned = new HashSet<>(sizes.keySet());
            Set<String> packHashes = new HashSet<>();
            for (int i = 0; i < packs.length(); i++) {
                JSONObject pack = packs.getJSONObject(i);
                String hash = pack.getString("hash");
                JSONArray members = pack.getJSONArray("files");
                if (!validHash(hash) || !packHashes.add(hash) || pack.getLong("bytes") <= 0 || members.length() == 0) {
                    throw new IOException("Invalid media pack");
                }
                for (int j = 0; j < members.length(); j++) {
                    if (!unassigned.remove(members.getString(j))) throw new IOException("Unexpected pack member");
                }
            }
            if (!unassigned.isEmpty()) throw new IOException("Missing pack members");
        } catch (Exception error) {
            throw new IllegalStateException("Invalid bundled Android asset manifest", error);
        }
    }

    private static JSONObject readManifest(Context context) throws Exception {
        InputStream input;
        try {
            input = context.getAssets().open("public/native-assets.json");
        } catch (FileNotFoundException absent) {
            return null;
        }
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int bytes;
            while ((bytes = in.read(buffer)) != -1) out.write(buffer, 0, bytes);
            return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
        }
    }

    private static boolean validHash(String hash) {
        return hash.matches("[a-f0-9]{64}");
    }

    private File blob(String hash) {
        return new File(directory, hash);
    }

    private boolean present(String hash) {
        File file = blob(hash);
        return file.isFile() && file.length() == sizes.get(hash);
    }

    private boolean needed(JSONObject pack) throws Exception {
        JSONArray members = pack.getJSONArray("files");
        for (int i = 0; i < members.length(); i++) {
            if (!present(members.getString(i))) return true;
        }
        return false;
    }

    JSObject status() throws Exception {
        long bytes = 0;
        for (int i = 0; i < packs.length(); i++) {
            JSONObject pack = packs.getJSONObject(i);
            if (needed(pack)) bytes += pack.getLong("bytes");
        }
        JSObject result = new JSObject();
        result.put("bytes", bytes);
        result.put("ready", bytes == 0);
        return result;
    }

    void install(Progress progress) throws Exception {
        synchronized (INSTALL_LOCK) {
            checkInterrupted();
            installMissingPacks(progress);
        }
    }

    private void installMissingPacks(Progress progress) throws Exception {
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Could not create game storage");
        long total = status().getLong("bytes");
        long done = 0;
        for (int i = 0; i < packs.length(); i++) {
            JSONObject pack = packs.getJSONObject(i);
            if (!needed(pack)) continue;
            String hash = pack.getString("hash");
            long bytes = pack.getLong("bytes");
            File part = new File(directory, hash + ".part");
            if (part.length() > bytes) delete(part);
            if (part.length() < bytes) download(hash, bytes, part, done, total, progress);
            progress.update(done + bytes, total, "Checking game files");
            if (part.length() != bytes || !hash.equals(digest(part))) {
                delete(part);
                throw new IOException("Game pack verification failed");
            }
            unpack(part, pack.getJSONArray("files"));
            delete(part);
            done += bytes;
        }
        if (!status().getBoolean("ready", false)) throw new IOException("Incomplete game files");
        File[] old = directory.listFiles();
        if (old != null) {
            for (File file : old) {
                if (!sizes.containsKey(file.getName())) file.delete();
            }
        }
    }

    private void download(String hash, long size, File part, long done, long total, Progress progress) throws IOException {
        long offset = part.length();
        HttpURLConnection connection = (HttpURLConnection) new URL(BASE_URL + hash + ".zip").openConnection();
        connection.setConnectTimeout(30000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept-Encoding", "identity");
        if (offset > 0) connection.setRequestProperty("Range", "bytes=" + offset + "-");
        try {
            int status = connection.getResponseCode();
            String contentRange = connection.getHeaderField("Content-Range");
            boolean append = status == 206 && offset > 0 &&
                ("bytes " + offset + "-" + (size - 1) + "/" + size).equals(contentRange);
            if (status != 200 && !append) throw new IOException("Download HTTP " + status);
            if (!append) offset = 0;
            if (directory.getUsableSpace() < size - offset) throw new IOException("Not enough storage space");
            try (InputStream in = connection.getInputStream(); FileOutputStream out = new FileOutputStream(part, append)) {
                byte[] buffer = new byte[BUFFER_SIZE];
                long lastUpdate = 0;
                int bytes;
                while ((bytes = in.read(buffer)) != -1) {
                    checkInterrupted();
                    offset += bytes;
                    if (offset > size) throw new IOException("Download exceeds expected size");
                    out.write(buffer, 0, bytes);
                    long now = android.os.SystemClock.elapsedRealtime();
                    if (now - lastUpdate >= 150) {
                        progress.update(done + offset, total, "Downloading game files");
                        lastUpdate = now;
                    }
                }
            }
            if (offset != size) throw new IOException("Download ended early");
        } finally {
            connection.disconnect();
        }
    }

    private void unpack(File part, JSONArray members) throws Exception {
        Set<String> remaining = new HashSet<>();
        for (int i = 0; i < members.length(); i++) remaining.add(members.getString(i));
        try (ZipInputStream zip = new ZipInputStream(new FileInputStream(part))) {
            byte[] buffer = new byte[BUFFER_SIZE];
            for (ZipEntry entry; (entry = zip.getNextEntry()) != null;) {
                String hash = entry.getName();
                if (entry.isDirectory() || !remaining.remove(hash)) throw new IOException("Unexpected ZIP entry");
                long size = sizes.get(hash);
                boolean reuse = present(hash);
                if (!reuse && directory.getUsableSpace() < size) throw new IOException("Not enough storage space");
                File temporary = new File(directory, hash + ".tmp");
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long count = 0;
                try (FileOutputStream out = reuse ? null : new FileOutputStream(temporary)) {
                    int bytes;
                    while ((bytes = zip.read(buffer)) != -1) {
                        checkInterrupted();
                        count += bytes;
                        if (count > size) throw new IOException("Media exceeds expected size");
                        digest.update(buffer, 0, bytes);
                        if (out != null) out.write(buffer, 0, bytes);
                    }
                    if (count != size || !hash.equals(hex(digest.digest()))) throw new IOException("Media verification failed");
                }
                if (!reuse) Os.rename(temporary.getAbsolutePath(), blob(hash).getAbsolutePath());
            }
        }
        if (!remaining.isEmpty()) throw new IOException("Incomplete media pack");
    }

    private static String digest(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(file)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            for (int bytes; (bytes = in.read(buffer)) != -1;) {
                checkInterrupted();
                digest.update(buffer, 0, bytes);
            }
        }
        return hex(digest.digest());
    }

    private static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            result.append(Character.forDigit((value & 0xff) >>> 4, 16));
            result.append(Character.forDigit(value & 0xf, 16));
        }
        return result.toString();
    }

    private static void checkInterrupted() throws InterruptedIOException {
        if (Thread.currentThread().isInterrupted()) throw new InterruptedIOException();
    }

    private static void delete(File file) throws IOException {
        if (file.exists() && !file.delete()) throw new IOException("Could not clear temporary download");
    }

    WebResourceResponse serve(WebResourceRequest request) {
        if (!"GET".equals(request.getMethod())) return null;
        String path = request.getUrl().getPath();
        if (path == null || !path.startsWith("/")) return null;
        String hash = paths.get(path.substring(1));
        if (hash == null) return null;
        if (!present(hash)) return responseError(404, "Game file missing", Collections.emptyMap());
        long size = sizes.get(hash);
        long start = 0;
        long end = size - 1;
        String range = null;
        for (Map.Entry<String, String> header : request.getRequestHeaders().entrySet()) {
            if ("Range".equalsIgnoreCase(header.getKey())) range = header.getValue();
        }
        try {
            if (range != null) {
                if (!range.matches("bytes=(\\d+-\\d*|-\\d+)")) return unsatisfied(size);
                String[] bounds = range.substring(6).split("-", -1);
                if (bounds[0].isEmpty()) {
                    start = Math.max(0, size - Long.parseLong(bounds[1]));
                } else {
                    start = Long.parseLong(bounds[0]);
                    if (!bounds[1].isEmpty()) end = Math.min(end, Long.parseLong(bounds[1]));
                }
                if (start > end) return unsatisfied(size);
            }
            long count = end - start + 1;
            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");
            headers.put("Content-Length", Long.toString(count));
            headers.put("Cache-Control", "no-store");
            if (range != null) headers.put("Content-Range", "bytes " + start + "-" + end + "/" + size);
            String extension = path.substring(path.lastIndexOf('.') + 1);
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mime == null) mime = "application/octet-stream";
            return new WebResourceResponse(mime, null, range == null ? 200 : 206,
                range == null ? "OK" : "Partial Content", headers, openRange(blob(hash), start, count));
        } catch (NumberFormatException error) {
            return unsatisfied(size);
        } catch (IOException error) {
            return responseError(500, "Game file error", Collections.emptyMap());
        }
    }

    private static WebResourceResponse unsatisfied(long size) {
        return responseError(416, "Range not satisfiable", Collections.singletonMap("Content-Range", "bytes */" + size));
    }

    private static WebResourceResponse responseError(int code, String reason, Map<String, String> headers) {
        return new WebResourceResponse("text/plain", "UTF-8", code, reason, headers, new ByteArrayInputStream(new byte[0]));
    }

    private static InputStream openRange(File file, long start, long count) throws IOException {
        RandomAccessFile input = new RandomAccessFile(file, "r");
        try {
            input.seek(start);
        } catch (IOException error) {
            input.close();
            throw error;
        }
        return new InputStream() {
            private long remaining = count;

            @Override
            public int read() throws IOException {
                if (remaining == 0) return -1;
                int value = input.read();
                if (value != -1) remaining--;
                return value;
            }

            @Override
            public int read(byte[] buffer, int offset, int length) throws IOException {
                if (length == 0) return 0;
                if (remaining == 0) return -1;
                int bytes = input.read(buffer, offset, (int) Math.min(length, remaining));
                if (bytes > 0) remaining -= bytes;
                return bytes;
            }

            @Override
            public void close() throws IOException {
                input.close();
            }
        };
    }
}
