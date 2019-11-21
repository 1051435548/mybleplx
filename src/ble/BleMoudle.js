import {BleManager} from 'react-native-ble-plx';
import {Alert} from 'react-native';
import {Buffer} from 'buffer';

export default class BleModule {

    constructor() {
        this.manager = new BleManager();
        this.isConnecting = false;
    }

    /**
     * 停止搜索蓝牙
     * */
    stopScan() {
        this.manager.stopDeviceScan();
        console.log('停止搜索');
    }

    /**
     * 卸载蓝牙管理器
     * */
    destroy() {
        this.manager.destroy();
    }

    alert = (text) =>  {
        Alert.alert('提示', text, [{
            text: '确定', onPress: () => {
            },
        }]);
    };

    /**
     * 连接蓝牙
     */
    connect(deviceId) {
        console.log('正在连接的设备ID：' + deviceId);
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            this.manager.connectToDevice(deviceId)
                .then(device => {
                    console.log('连接成功：设备名称' + device.name, ' 设备ID' + device.id);
                    this.peripheralId = device.id;
                    return device.discoverAllServicesAndCharacteristics();
                })
                .then(device => {
                    return BleModule.fetchServicesAndCharacteristicsForDevice(device);
                })
                .then(services => {
                    this.isConnecting = false;
                    this.getUUID(services);
                    resolve();
                })
                .catch(error => {
                    this.isConnecting = false;
                    console.log('连接失败:', error);
                    reject(error);
                });
        });
    }

    /**
     * 断开蓝牙
     * */
    disconnect() {
        return new Promise((resolve, reject) => {
            this.manager.cancelDeviceConnection(this.peripheralId)
                .then(res => {
                    console.log('disconnect success', res);
                    resolve(res);
                })
                .catch(err => {
                    reject(err);
                    console.log('disconnect fail', err);
                });
        });
    }

    /**
     * 获取蓝牙UUID
     * @param device
     * @returns {Promise<void>}
     */
    static async fetchServicesAndCharacteristicsForDevice(device) {
        let servicesMap = {};
        let services = await device.services();

        for (let service of services) {
            let characteristicsMap = {};
            let characteristics = await service.characteristics();

            for (let characteristic of characteristics) {
                characteristicsMap[characteristic.uuid] = {
                    uuid: characteristic.uuid,
                    isReadable: characteristic.isReadable,
                    isWritableWithResponse: characteristic.isWritableWithResponse,
                    isWritableWithoutResponse: characteristic.isWritableWithResponse,
                    isNotifiable: characteristic.isNotifiable,
                    isNotifying: characteristic.isNotifying,
                    value: characteristic.value,
                };
            }

            servicesMap[service.uuid] = {
                uuid: service.uuid,
                isPrimary: service.isPrimary,
                characteristicsMap: characteristics.length,
                characteristics: characteristicsMap,
            };
        }
        return servicesMap;
    };

    /**
     * 初始化UUID
     */
    initUUID() {
        // services
        this.readServiceUUID = [];
        this.writeWithResponseServiceUUID = [];
        this.writeWithoutResponseServiceUUID = [];
        this.nofityServiceUUID = [];
        // characteristic
        this.readCharacteristicUUID = [];
        this.writeWithResponseCharacteristicUUID = [];
        this.writeWithoutResponseCharacteristicUUID = [];
        this.nofityCharacteristicUUID = [];
    }

    /**
     * 获取Notify、Read、Write、WriteWithoutResponse的serviceUUID和characteristicUUID
     */
    getUUID(services) {
        this.initUUID();
        for (let i in services) {
            //services里面包含了很多个characteristics
            let characteristic = services[i].characteristics;
            for (let j in characteristic) {
                //characteristic里面包含isNotifiable、isNotifying、isReadable、isWritableWithResponse、isWritableWithoutResponse、uuid、value
                if (characteristic[j].isReadable) {
                    this.readServiceUUID.push(services[i].uuid);
                    this.readCharacteristicUUID.push(characteristic[j].uuid);
                }
                if (characteristic[j].isWritableWithResponse) {
                    this.writeWithResponseServiceUUID.push(services[i].uuid);
                    this.writeWithResponseCharacteristicUUID.push(characteristic[j].uuid);
                }
                if (characteristic[j].isWritableWithoutResponse) {
                    this.writeWithoutResponseServiceUUID.push(services[i].uuid);
                    this.writeWithoutResponseCharacteristicUUID.push(characteristic[j].uuid);
                }
                if (characteristic[j].isNotifiable) {
                    this.nofityServiceUUID.push(services[i].uuid);
                    this.nofityCharacteristicUUID.push(characteristic[j].uuid);
                }
            }
        }
    }

    /**
     * 写数据
     */
    write(value, index) {
        let formatValue;
        if (value === '0D0A') {
            formatValue = value;
        } else {
            formatValue = value.split("").map(char => char.charCodeAt(0));
            console.log("write: " + Buffer.from(formatValue).toString("base64"))
        }
        let transactionId = 'write';
        return new Promise((resolve, reject) => {
            this.manager.writeCharacteristicWithResponseForDevice(
                this.peripheralId,
                this.writeWithResponseServiceUUID[index],
                this.writeWithResponseCharacteristicUUID[index],
                Buffer.from(formatValue).toString("base64"),
                transactionId,
            ).then(characteristic => {
                resolve(characteristic);
            }).catch(error => {
                this.alert('write fail: ', error.reason);
                reject(error);
            });
        });
    }

    /**
     * 写数据 withoutResponse
     */
    writeWithoutResponse(value, index) {
        let formatValue;
        if (value === '0D0A') {
            formatValue = value;
        } else {
            formatValue = value.split("").map(char => char.charCodeAt(0));
            console.log("withoutResponse: " + formatValue)
        }
        let transactionId = 'writeWithoutResponse';
        return new Promise((resolve, reject) => {
            this.manager.writeCharacteristicWithoutResponseForDevice(
                this.peripheralId,
                this.writeWithoutResponseServiceUUID[index],
                this.writeWithoutResponseCharacteristicUUID[index],
                Buffer.from(formatValue).toString("base64"),
                transactionId,
            ).then(characteristic => {
                resolve(characteristic);
            }).catch(error => {
                this.alert('writeWithoutResponse fail: ',error.reason);
                reject(error);
            });
        });
    };

    /**
     * 读取数据
     * @param index
     * @returns {Promise<any> | Promise<*>}
     */
    read(index) {
        return new Promise((resolve, reject) => {
            this.manager.readCharacteristicForDevice(
                this.peripheralId,
                this.readServiceUUID[index],
                this.readCharacteristicUUID[index],
            ).then(characteristic => {
                let buffer = Buffer.from(characteristic.value, 'base64');
                const value = BleModule.byteToString(buffer);
                resolve(value);
            }).catch(error => {
                this.alert('read fail: ' + error.reason);
                reject(error);
            });
        });
    };


    /**
     * byte数组转换成字符串
     */
    static byteToString(arr) {
        if (typeof arr === 'string') {
            return arr;
        }
        let str = '',
            _arr = arr;
        for (let i = 0; i < _arr.length; i++) {
            let one = _arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if (v && one.length === 8) {
                let bytesLength = v[0].length;
                let store = _arr[i].toString(2).slice(7 - bytesLength);
                for (let st = 1; st < bytesLength; st++) {
                    store += _arr[st + i].toString(2).slice(2);
                }
                str += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                str += String.fromCharCode(_arr[i]);
            }
        }
        return str;
    }
}
