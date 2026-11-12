package com.zukito.spaceimpactdefender;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(LanRelayPlugin.class);
        registerPlugin(FlightViewPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
