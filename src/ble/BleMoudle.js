import {
    Platform,
    Alert,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';
import {Buffer} from 'buffer';

export default class BleModule {

    constructor() {
        this.manager = new BleManager();

    }
}
