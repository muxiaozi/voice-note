const xunfei = require('../../utils/xunfei.js')

Page({
  data: {
    value: null, // 上次计算后的结果，null表示没有上次计算的结果
    displayValue: '0', // 显示数值
    operator: null, // 上次计算符号，null表示没有未完成的计算
    waitingForOperand: false // 前一按键是否为计算符号
  },

  onLoad: function (options) {
    this.calculatorOperations = {
      'key-divide': (prevValue, nextValue) => prevValue / nextValue,
      'key-multiply': (prevValue, nextValue) => prevValue * nextValue,
      'key-add': (prevValue, nextValue) => prevValue + nextValue,
      'key-subtract': (prevValue, nextValue) => prevValue - nextValue,
      'key-equals': (prevValue, nextValue) => nextValue
    }
  },

  /* AC操作，一下回到解放前 */
  clearAll() {
    this.setData({
      value: null,
      displayValue: '0',
      operator: null,
      waitingForOperand: false
    })
  },

  /* 仅清空当前显示的输入值 */
  clearDisplay() {
    this.setData({
      displayValue: '0'
    })
  },

  onTapFunction: function (event) {
    const key = event.target.dataset.key;

    switch (key) {
      case 'key-clear':
        this.playVoice(`/voice/clear.mp3`)
        if (this.data.displayValue !== '0') {
          this.clearDisplay();
        } else {
          this.clearAll();
        }

        break;

      case 'key-sign':
        
        var newValue = parseFloat(this.data.displayValue) * -1

        if (newValue >= 0){
          this.playVoice(`/voice/postive.mp3`)
        }else{
          this.playVoice(`/voice/negative.mp3`)
        }
        
        this.setData({
          displayValue: String(newValue)
        })

        break;

      case 'key-percent':
        this.playVoice(`/voice/percent.mp3`)
        const fixedDigits = this.data.displayValue.replace(/^-?\d*\.?/, '')
        var newValue = parseFloat(this.data.displayValue) / 100

        this.setData({
          displayValue: String(newValue.toFixed(fixedDigits.length + 2))
        });

        break;

      default:
        break;
    }
  },

  onTapOperator: function (event) {
    const nextOperator = event.target.dataset.key;
    const inputValue = parseFloat(this.data.displayValue);

    switch(event.target.dataset.key)
    {
      case 'key-add':
        this.playVoice(`/voice/add.mp3`)
        break;
      case 'key-subtract':
        this.playVoice(`/voice/sub.mp3`)
        break;
      case 'key-multiply':
        this.playVoice(`/voice/multi.mp3`)
        break;
      case 'key-divide':
        this.playVoice(`/voice/div.mp3`)
        break;
      case 'key-equals':
        this.playVoice(`/voice/equal.mp3`)
        break;
    }

    if (this.data.value == null) {
      this.setData({
        value: inputValue
      });
    } else if (this.data.operator) {
      const currentValue = this.data.value || 0;
      const newValue = this.calculatorOperations[this.data.operator](currentValue, inputValue);

      if (event.target.dataset.key === 'key-equals'){
        setTimeout(() => {
          if(Number.isFinite(newValue)){
            this.readContent(String(newValue))
          }else{
            this.playVoice(`/voice/error.mp3`)
          }
        }, 300)
      }

      this.setData({
        value: newValue,
        displayValue: String(newValue)
      });
    }

    this.setData({
      waitingForOperand: true,
      operator: nextOperator
    });
  },

  onTapDigit: function (event) {
    const key = event.target.dataset.key; // 根据data-key标记按键

    if (key == 'key-dot') {
      this.playVoice('/voice/dot.mp3')

      // 按下点号
      if (!(/\./).test(this.data.displayValue)) {
        this.setData({
          displayValue: this.data.displayValue + '.',
          waitingForOperand: false
        })
      }
    } else {
      // 按下数字键
      const digit = key[key.length - 1];

      this.playVoice(`/voice/${String(digit)}.mp3`)

      if (this.data.waitingForOperand) {
        this.setData({
          displayValue: String(digit),
          waitingForOperand: false
        })
      } else {
        this.setData({
          displayValue: this.data.displayValue === '0' ? String(digit) : this.data.displayValue + digit
        })
      }
    }
  },

  /**
   * 语音合成
   */
  readContent(content) {
    xunfei.tts(content)
      .then(tempFilePath => {
        // 播放tempFilePath
        this.playVoice(tempFilePath)
      })
      .catch(err => console.error)
  },

  /**
   * 播放音频
   */
  playVoice(voicePath){
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.autoplay = true
    innerAudioContext.src = voicePath
    innerAudioContext.onPlay(() => {
      console.log('开始播放', voicePath)
    })
    innerAudioContext.onError(res => console.error)
    innerAudioContext.play()
  }
})