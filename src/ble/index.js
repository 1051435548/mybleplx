import React, {Component} from 'react';
import {StyleSheet, Text, TouchableOpacity, View, Platform} from 'react-native';
import BleModule from './BleMoudle';

global.BluetoothManager = new BleModule();
export default class BlePlx extends Component {

    constructor(props) {
        super(props);
    }

    componentDidMount(): void {

        //监听系统蓝牙的变化
        this.onStateChangeListener = BluetoothManager.manager.onStateChange((state) => {
            console.log("onStateChange: ", state);
            if(state === 'PoweredOn'){
                this.scan();
            }
        });
    }

    componentWillUnmount(): void {
        this.onStateChangeListener && this.onStateChangeListener.remove();
    }


    /**
     * 查找蓝牙设备
     */
    scan = () => {
        console.log("开始查找设备");
    };

    render() {
        return (
            <View>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.buttonView, {marginHorizontal: 10, height: 40, alignItems: 'center'}]}
                    onPress={this.scan.bind(this)}
                >
                    <Text style={styles.buttonText}>搜索蓝牙</Text>
                </TouchableOpacity>
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

