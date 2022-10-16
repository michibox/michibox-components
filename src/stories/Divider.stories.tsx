import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import Divider from '../components/Divider';

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
    title: 'Example/Divider',
    component: Divider
} as ComponentMeta<typeof Divider>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Divider> = (args) => <Divider {...args} />;

export const Primary = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Primary.args = {
};
