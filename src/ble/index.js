import React, {Component} from 'react';
import {Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import BleModule from './BleMoudle';
import {ScanMode} from 'react-native-ble-plx';

// 全局唯一的ble实例
global.BluetoothManager = new BleModule();
export default class BlePlx extends Component {

    constructor(props) {
        super(props);
        this.state = {
            scaning: false, //是否正在扫描蓝牙设备
            devicesData: [], //搜到到的蓝牙设备
            isConnected: false, //是否连接上设备
            text: '',
            writeData: '',
            receiveData: '',
            readData: '',
            isMonitoring: false,
        };
        this.bluetoothReceiveData = [];
        this.deviceMap = new Map(); //搜索到的蓝牙设备(将id作为键值存入保证不重复)
    }

    componentDidMount(): void {

        //监听系统蓝牙的变化
        this.onStateChangeListener = BluetoothManager.manager.onStateChange((state) => {
            console.log('onStateChange: ', state);
            if (state === 'PoweredOn') {
                this.scan();
            }
        });
    }

    componentWillUnmount(): void {
        BluetoothManager.destroy();
        // 销毁组件时关掉所有监听
        this.onStateChangeListener && this.onStateChangeListener.remove();
        this.monitorListener && this.monitorListener.remove();
        this.disconnectListener && this.disconnectListener.remove();
    }


    alert = (text) => {
        Alert.alert('提示', text, [{
            text: '确定', onPress: () => {
            },
        }]);
    };

    /**
     * 打开手机蓝牙
     */
    accessOpenBlue = () => {
        BluetoothManager.manager.enable()
            .then(() => {
                this.setState({scaning: false});
                this.scan();
                this.alert('蓝牙已连接');
                console.log('系统请求打开蓝牙成功');
            })
            .catch(e => {
                console.log('异常: ' + e);
            });
    };

    /**
     * 查找蓝牙设备
     */
    scan = () => {
        if (!this.state.scaning) {
            this.setState({scaning: true});
            this.deviceMap.clear();
            BluetoothManager.manager.startDeviceScan(null, {scanMode: ScanMode.LowLatency}, (error, device) => {
                if (error) {
                    //如果异常为[Device not authorized to use BluetoothLE] 则检查应用的位置权限是否打开
                    console.log('startDeviceScan error:', error);
                    if (error.errorCode === 102) {
                        Alert.alert(
                            '提示',
                            '请打开手机蓝牙后再搜索',
                            [{
                                text: '确定',
                                onPress: () => {
                                    this.accessOpenBlue();
                                },
                            }]);
                    }
                    this.setState({scaning: false});
                } else {
                    this.deviceMap.set(device.id, device); //使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备
                    this.setState({
                        devicesData: [...this.deviceMap.values()],
                    });
                }
            });

            this.scanTimer && clearTimeout(this.scanTimer);
            this.scanTimer = setTimeout(() => {
                if (this.state.scaning) {
                    BluetoothManager.stopScan();
                    this.setState({scaning: false});
                }
            }, 5000);  //5秒后停止搜索

        } else {
            BluetoothManager.stopScan();
            this.setState({scaning: false});
        }
    };

    /**
     * 断开蓝牙连接
     */
    disconnect = () => {
        BluetoothManager.disconnect()
            .then(response => {
                this.setState({data: [...this.deviceMap.values()], isConnected: false});
            })
            .catch(error => {
                this.setState({data: [...this.deviceMap.values()], isConnected: false});
            });
    };

    /**
     * 连接蓝牙设备
     */
    connect = (device) => {
        if (this.state.scaning) {  //连接的时候正在扫描，先停止扫描
            BluetoothManager.stopScan();
            this.setState({scaning: false});
        }
        if (BluetoothManager.isConnecting) {
            this.alert('当前蓝牙正在连接时不能打开另一个连接进程');
            return;
        }

        let newData = [...this.deviceMap.values()];
        newData[device.index].isConnecting = true;  //正在连接中
        this.setState({devicesData: newData});

        BluetoothManager.connect(device.item.id)
            .then(() => {
                newData[device.index].isConnecting = false;
                this.setState({
                    devicesData: [newData[device.index]],
                    isConnected: true,
                });
                this.onDisconnect();
            })
            .catch(error => {
                newData[device.index].isConnecting = false;
                this.setState({
                    devicesData: [...newData],
                });
                this.alert(error);
            });
    };

    /**
     * 渲染当设备为空时
     */
    renderEmptyDevice = () => {
        return (
            <Text style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold'}}>
                没有数据
            </Text>
        );
    };

    /**
     * 渲染每条蓝牙设备
     */
    renderDeviceItem = (device) => {
        const data = device.item;
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                disabled={!!this.state.isConnected}
                style={styles.item}
                onPress={() => this.connect(device)}
            >
                <View style={{flexDirection: 'row'}}>
                    <Text style={{color: 'black'}}>{data.name ? data.name : 'Unknown device'}</Text>
                    <Text style={{color: 'red', marginLeft: 50}}>{data.isConnecting ? '连接中...' : ''}</Text>
                </View>
                <Text>{data.id}</Text>
            </TouchableOpacity>
        );
    };

    /**
     * 监听蓝牙断开
     */
    onDisconnect = () => {
        this.disconnectListener = BluetoothManager.manager.onDeviceDisconnected(BluetoothManager.peripheralId, (error, device) => {
            if (error) {
                this.setState({
                    devicesData: [...this.deviceMap.values()],
                    isConnected: false,
                });
            } else {
                this.disconnectListener && this.disconnectListener.remove();
            }
        });
    };

    write = (index, type) => {
        if (this.state.text.length === 0) {
            this.alert('请输入消息');
            return;
        }
        BluetoothManager.write(this.state.text, index)
            .then(() => {
                this.bluetoothReceiveData = [];
                this.setState({
                    writeData: this.state.text,
                    text: '',
                });
            })
            .catch(error => {
                console.log(error);
            });
    };

    writeWithoutResponse = (index, type) => {
        if (this.state.text.length === 0) {
            this.alert('请输入消息');
            return;
        }
        BluetoothManager.writeWithoutResponse(this.state.text, index, type)
            .then(() => {
                this.bluetoothReceiveData = [];
                this.setState({
                    writeData: this.state.text,
                    text: '',
                });
            })
            .catch(error => {
                console.log();
            });
    };

    read = (index) => {
        BluetoothManager.read(index)
            .then(value => {
                this.setState({readData: value});
            })
            .catch(error => {
                console.log(error);
            });
    };

    monitor = (index) => {
        let transactionId = 'monitor';
        this.monitorListener = BluetoothManager.manager.monitorCharacteristicForDevice(
            BluetoothManager.peripheralId,
            BluetoothManager.nofityServiceUUID[index],
            BluetoothManager.nofityCharacteristicUUID[index],
            (error, characteristic) => {
                if (error) {
                    this.setState({isMonitoring: false});
                    this.alert('monitor fail: ' + error.reason);
                } else {
                    this.setState({isMonitoring: true});
                    this.bluetoothReceiveData.push(characteristic.value);
                    this.setState({
                        receiveData: this.bluetoothReceiveData.join(''),
                    });
                }
            }, transactionId,
        );
    };

    renderFooter = () => {
        return (
            <View style={{marginBottom: 30}}>
                {
                    this.state.isConnected ?
                        <View>
                            {
                                this.renderWriteView(
                                    '写数据(write)',
                                    '发送',
                                    BluetoothManager.writeWithResponseCharacteristicUUID,
                                    this.write,
                                )
                            }
                            {
                                this.renderWriteView(
                                    '写数据(writeWithoutResponse)',
                                    '发送',
                                    BluetoothManager.writeWithoutResponseCharacteristicUUID,
                                    this.writeWithoutResponse,
                                )
                            }
                            {
                                this.renderReceiveView(
                                    '读取的数据',
                                    '读取',
                                    BluetoothManager.readCharacteristicUUID,
                                    this.read,
                                    this.state.readData,
                                )
                            }
                            {
                                this.renderReceiveView(
                                    `监听接收的数据：${this.state.isMonitoring ? '监听已开启' : '监听未开启'}`,
                                    '开启监听',
                                    BluetoothManager.nofityCharacteristicUUID,
                                    this.monitor,
                                    this.state.receiveData)
                            }
                        </View>
                        :
                        <View style={{marginBottom: 20}}/>
                }
            </View>
        );
    };


    renderWriteView = (label, buttonText, characteristics, onPress, state) => {
        if (characteristics.length === 0) {
            return null;
        }
        return (
            <View style={{marginHorizontal: 10, marginTop: 30}} behavior='padding'>
                <Text style={{color: 'black'}}>{label}</Text>
                <Text style={styles.content}>
                    {this.state.writeData}
                </Text>
                {characteristics.map((item, index) => {
                    return (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.7}
                            style={styles.buttonView}
                            onPress={() => {
                                onPress(index);
                            }}>
                            <Text style={styles.buttonText}>{buttonText} ({item})</Text>
                        </TouchableOpacity>
                    );
                })}
                <TextInput
                    style={[styles.textInput]}
                    value={this.state.text}
                    placeholder='请输入消息'
                    onChangeText={(text) => {
                        this.setState({text});
                    }}
                />
            </View>
        );
    };
    renderReceiveView = (label, buttonText, characteristics, onPress, state) => {
        if (characteristics.length === 0) {
            return null;
        }
        return (
            <View style={{marginHorizontal: 10, marginTop: 30}}>
                <Text style={{color: 'black', marginTop: 5}}>{label}</Text>
                <Text style={styles.content}>
                    {state}
                </Text>
                {
                    characteristics.map((item, index) => {
                        return (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={styles.buttonView}
                                onPress={() => {
                                    onPress(index);
                                }}
                                key={index}>
                                <Text style={styles.buttonText}>{buttonText} ({item})</Text>
                            </TouchableOpacity>
                        );
                    })
                }
            </View>
        );
    };

    render() {
        const {devicesData, isConnected, text, receiveData, readData, writeData, isMonitoring, scaning} = this.state;
        return (
            <View style={styles.container}>
                <View style={{marginTop: 20}}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.buttonView, {marginHorizontal: 10, height: 40, alignItems: 'center'}]}
                        onPress={isConnected ? this.disconnect.bind(this) : this.scan.bind(this)}>
                        <Text
                            style={styles.buttonText}>{scaning ? '正在搜索中...' : isConnected ? '断开蓝牙' : '搜索蓝牙'}</Text>
                    </TouchableOpacity>

                    <Text style={{marginLeft: 10, marginTop: 10}}>
                        {isConnected ? '当前连接的设备' : '可用设备'}
                    </Text>
                </View>

                <FlatList
                    data={devicesData}
                    keyExtractor={item => item.id}
                    extraData={[isConnected, text, receiveData, readData, writeData, isMonitoring, scaning]}
                    renderItem={(item) => this.renderDeviceItem(item)}
                    ListEmptyComponent={this.renderEmptyDevice()}
                    ListFooterComponent={this.renderFooter()}
                />

            </View>
        );
    }

}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: Platform.OS === 'ios' ? 20 : 0,
    },
    item: {
        flexDirection: 'column',
        borderColor: 'rgb(235,235,235)',
        borderStyle: 'solid',
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingLeft: 10,
        paddingVertical: 8,
    },
    buttonView: {
        height: 30,
        backgroundColor: 'rgb(33, 150, 243)',
        paddingHorizontal: 10,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 12,
    },
    content: {
        marginTop: 5,
        marginBottom: 15,
    },
    textInput: {
        paddingLeft: 5,
        paddingRight: 5,
        backgroundColor: 'white',
        height: 50,
        fontSize: 16,
        flex: 1,
    },
});

