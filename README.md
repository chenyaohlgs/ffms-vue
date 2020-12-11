# ffms-vue

> 这是家庭财务管理系统的前端页面，通过vue实现，实现的令牌登录与动态加载路由的功能
> 根据[vue-admin-template](https://github.com/PanJiaChen/vue-admin-template/)进行修改

## Build Setup

```bash
# 克隆项目
git clone git@github.com:chenyaohlgs/ffms-vue.git

# 进入项目目录
cd ffms-vue

# 安装依赖
npm install

# 建议不要直接使用 cnpm 安装以来，会有各种诡异的 bug。可以通过如下操作解决 npm 下载速度慢的问题
npm install --registry=https://registry.npm.taobao.org

# 启动服务
npm run dev
```

浏览器访问 [http://localhost:9528](http://localhost:9528)

## 发布

```bash
# 构建测试环境
npm run build:stage

# 构建生产环境
npm run build:prod
```

## 其它

```bash
# 预览发布环境效果
npm run preview

# 预览发布环境效果 + 静态资源分析
npm run preview -- --report

# 代码格式检查
npm run lint

# 代码格式检查并自动修复
npm run lint -- --fix
```

## 令牌登录的实现

- 具体的令牌登录实现的思想是通过这样的：前端在想后端发送登录请求的时，等到后端发送回来的token
  前端会根据token向后端发送<font color= #A52A2A>getUserInfo</font>请求获取用户信息,并将token存放在cookie中。此后每次前端发送请求时，都在请求头中添加token

- 设置前端拦截器以及后端拦截器

```js
import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// create an axios instance
const service = axios.create({
  // baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  baseURL: 'http://localhost:8080',
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 50000 // 请求超时时间
})

// request interceptor
service.interceptors.request.use(
  config => {
    // console.log('开始执行前置过滤器')
    if (store.getters.token) {
      // 在每次发送请求的时候都在请求头中携带token
      config.headers['token'] = getToken()
    }
    // console.log('结束执行前置过滤器')
    return config
  },
  error => {
    // console.log('前置控制出现失败')
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * 如果你想要获取http信息，可以使用下面的语句
   * return  response => response
  */

  /**
   * res.code是与后端进行规定的，也可以统一使用http的状态码
   */
  response => {
    // console.log('开始执行后置过滤器')
    const res = response.data
    // console.log(res)
    if (res.code !== 20000) {
      Message({
        message: res.message || 'Error',
        type: 'error',
        duration: 5 * 1000
      })

      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res
    }
  },
  error => {
    console.log('err' + error) // for debug
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service // export default每个js文件只能出现一次，export可以出现多次

```

- 事件触发函数login/index.vue

```js
this.$refs.loginForm.validate(valid => { // 首先进行前端的校验
        if (valid) {
          this.loading = true
          this.$store.dispatch('user/login', this.loginForm).then(() => { //执行vuex中的loign方法
            this.$router.push({ path: this.redirect || '/' }) // 登录成功后重定向到首页
            this.loading = false
          }).catch(() => {
            this.loading = false
          })
        } else {
          console.log('error submit!!')
          return false
        }
      })
```

- <font color = #E9967A>this.$store.dispatch</font>这个语句是执行store中user.js文件中的login方法

```js
// user.js
login({ commit }, userInfo) {
    const username = userInfo.username.trim()
    return new Promise((resolve, reject) => {
      login(username, userInfo.password).then(response => {
        const data = response.data
        setToken(data.token)
        commit('SET_TOKEN', data.token) //SET_TOKEN就是将token保存在state中
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },
  // get user info
  getInfo({ commit, state }) {
    return new Promise((resolve, reject) => {
      getInfo(state.token).then(response => {
        const { data } = response
        // console.log(data)
        if (!data) {
          return reject('Verification failed, please Login again.')
        }
        const name = data.name
        const avatar = data.avatar
        const role = data.role
        commit('SET_NAME', name)
        commit('SET_AVATAR', avatar)
        commit('SET_ROLE', role)
        resolve(data)
      }).catch(error => {
        reject(error)
      })
    })
  }
```

- 用户登录成功之后，我们会在全局钩子<font color = #E9967A>router.beforeEach</font>中拦截路由，判断是否已获得token，在获得token之后我们就要去获取用户的基本信息了

```js
router.beforeEach(async(to, from, next) => {
    const hasToken = getToken()
  // console.log(hasToken)
  if (hasToken) {
    if (to.path === '/login') {
      // if is logged in, redirect to the home page
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasGetUserInfo = store.getters.name
      // console.log(hasGetUserInfo)
      if (hasGetUserInfo) {
        next()
      } else {
        try {
          // get user info
          console.log(hasGetUserInfo)
          await store.dispatch('user/getInfo')
        }
        catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
      }
    }
  }
}
else {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
}
```

## 权限处理

- 权限处理在前后端都要完成，因为前端权限控制是不够安全的，但是前端的权限控制可以给用户很好的体验

- 本文采用的前端控制思想主要是是通过用户信息中的角色属性进行路由的动态加载设置。通过关键的<font color = #E9967A>addRoutes</font>代码进行动态加载路由

- 首先配置路由表 src/router/index.js

```js
// router.js
import Vue from 'vue';
import Router from 'vue-router';

import Login from '../views/login/';
const dashboard = resolve => require(['../views/dashboard/index'], resolve);
//使用了vue-routerd的[Lazy Loading Routes
](https://router.vuejs.org/en/advanced/lazy-loading.html)

//所有权限通用路由表 
//如首页和登录页和一些不用权限的公用页面
export const constantRouterMap = [
  { path: '/login', component: Login },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    name: '首页',
    children: [{ path: 'dashboard', component: dashboard }]
  },
]

//实例化vue的时候只挂载constantRouter
export default new Router({
  routes: constantRouterMap
});

//异步挂载的路由
//动态需要根据权限加载的路由表 
export const asyncRouterMap = [
  {
    path: '/permission',
    component: Layout,
    name: '权限测试',
    meta: { role: ['admin','super_editor'] }, //页面需要的权限
    children: [
    { 
      path: 'index',
      component: Permission,
      name: '权限测试页',
      meta: { role: ['admin','super_editor'] }  //页面需要的权限
    }]
  },
  { path: '*', redirect: '/404', hidden: true }
];
```

- 关键的是src/permission.js,要同时修改store中的getter.js以及index.js文件

```js
router.beforeEach(async(to, from, next) => {
    const hasToken = getToken()
  // console.log(hasToken)
  if (hasToken) {
    if (to.path === '/login') {
      // if is logged in, redirect to the home page
      next({ path: '/' })
      NProgress.done()
    } else {
      const hasGetUserInfo = store.getters.name
      // console.log(hasGetUserInfo)
      if (hasGetUserInfo) {
        next()
      } else {
        try {
          // get user info
          console.log(hasGetUserInfo)
          await store.dispatch('user/getInfo').then(() => {
            const roles = store.getters.role
            console.log(roles)
            store.dispatch('permission/GenerateRoutes', { roles }).then(() => { // 生成可访问的路由表
              // console.log(store.getters.role)
              router.options.routes = store.getters.addRouters // this.router.options.routes 为了菜单组件获取
              router.addRoutes(store.getters.addRouters) // 动态添加可访问路由表
              next({ ...to, replace: true })
            })
          })
        }
        catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
      }
    }
  }
}
else {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
}
```

- store/modules/permission.js

```js
import { asyncRouterMap, constantRouterMap } from '@/router'

function hasPermission(roles, route) {
  if (route.meta && route.meta.role) {
    return route.meta.role.indexOf(roles) > -1
  } else {
    return true
  }
}

const state = {
  routers: constantRouterMap,
  addRouters: []
}

const mutations = {
  SET_ROUTERS: (state, routers) => {
    state.addRouters = routers
    console.log(state.addRouters)
    state.routers = constantRouterMap.concat(routers)
  }
}
const actions = {
  GenerateRoutes({ commit }, data) { // data参数传入的是角色
    return new Promise(resolve => {
      const { roles } = data
      const accessedRouters = asyncRouterMap.filter(v => {
        if (roles.indexOf('admin') >= 0) {
          return true// 如果角色中有admin角色，则返回所有的挂载路由
        }
        if (hasPermission(roles, v)) {
          if (v.children && v.children.length > 0) {
            v.children = v.children.filter(child => {
              if (hasPermission(roles, child)) {
                return child
              }
              return false
            })
            return v
          } else {
            return v
          }
        }
        return false
      })
      commit('SET_ROUTERS', accessedRouters)
      console.log(accessedRouters)
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
```